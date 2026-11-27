# Readiness, admission and draining

Read this when implementing or reviewing startup, readiness, liveness or
graceful shutdown. The example is std-only and runtime-free so the state
rules stay visible; an async service keeps the same states and replaces the
condition variable with its runtime's primitives (see `/async-rust`).

The rules it encodes:

- Readiness is true only after startup validation finished and before
  draining begins. Liveness stays true while draining: the process is
  healthy, it is just not taking new work, and an orchestrator must not
  restart it for that.
- Admission and the state check happen under one lock, so no request can be
  admitted after draining starts.
- Each admitted unit of work holds a guard; dropping it, including during a
  panic unwind, releases its slot.
- Draining waits for in-flight work only until the shutdown deadline, then
  reports how much was still running instead of claiming a clean stop.

```rust
use std::sync::{Arc, Condvar, Mutex, MutexGuard, PoisonError};
use std::time::Instant;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Phase {
    Starting,
    Ready,
    Draining,
    Stopped,
}

#[derive(Debug, PartialEq, Eq)]
pub enum DrainOutcome {
    Drained,
    TimedOut { in_flight: usize },
}

struct State {
    phase: Phase,
    in_flight: usize,
}

pub struct Lifecycle {
    state: Mutex<State>,
    idle: Condvar,
}

/// Held for the duration of one admitted unit of work.
pub struct WorkGuard {
    lifecycle: Arc<Lifecycle>,
}

impl Drop for WorkGuard {
    fn drop(&mut self) {
        let mut state = self.lifecycle.lock();
        state.in_flight -= 1;
        if state.in_flight == 0 {
            self.lifecycle.idle.notify_all();
        }
    }
}

impl Lifecycle {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            state: Mutex::new(State { phase: Phase::Starting, in_flight: 0 }),
            idle: Condvar::new(),
        })
    }

    fn lock(&self) -> MutexGuard<'_, State> {
        // The state stays consistent under a panic: every update is a single
        // assignment, so a poisoned lock is still safe to use.
        self.state.lock().unwrap_or_else(PoisonError::into_inner)
    }

    /// Call after configuration and required dependencies are validated.
    pub fn mark_ready(&self) {
        let mut state = self.lock();
        if state.phase == Phase::Starting {
            state.phase = Phase::Ready;
        }
    }

    pub fn is_ready(&self) -> bool {
        self.lock().phase == Phase::Ready
    }

    pub fn is_live(&self) -> bool {
        self.lock().phase != Phase::Stopped
    }

    /// Admits work only while ready.
    pub fn try_admit(self: &Arc<Self>) -> Option<WorkGuard> {
        let mut state = self.lock();
        if state.phase != Phase::Ready {
            return None;
        }
        state.in_flight += 1;
        Some(WorkGuard { lifecycle: Arc::clone(self) })
    }

    /// Stops admission and waits for in-flight work until `deadline`.
    pub fn drain(&self, deadline: Instant) -> DrainOutcome {
        let mut state = self.lock();
        state.phase = Phase::Draining;
        while state.in_flight > 0 {
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                return DrainOutcome::TimedOut { in_flight: state.in_flight };
            }
            let (guard, _timeout) = self
                .idle
                .wait_timeout(state, remaining)
                .unwrap_or_else(PoisonError::into_inner);
            state = guard;
        }
        state.phase = Phase::Stopped;
        DrainOutcome::Drained
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn not_ready_until_marked_and_not_ready_while_draining() {
        let lifecycle = Lifecycle::new();
        assert!(!lifecycle.is_ready() && lifecycle.try_admit().is_none());
        lifecycle.mark_ready();
        assert!(lifecycle.is_ready());
        assert_eq!(lifecycle.drain(Instant::now()), DrainOutcome::Drained);
        assert!(!lifecycle.is_ready() && lifecycle.try_admit().is_none());
    }

    #[test]
    fn drain_waits_for_admitted_work() {
        let lifecycle = Lifecycle::new();
        lifecycle.mark_ready();
        let guard = lifecycle.try_admit().unwrap();
        let worker = thread::spawn(move || drop(guard));
        let outcome = lifecycle.drain(Instant::now() + Duration::from_secs(10));
        worker.join().unwrap();
        assert_eq!(outcome, DrainOutcome::Drained);
        assert!(!lifecycle.is_live());
    }

    #[test]
    fn drain_reports_work_still_running_at_the_deadline() {
        let lifecycle = Lifecycle::new();
        lifecycle.mark_ready();
        let _held = lifecycle.try_admit().unwrap();
        let outcome = lifecycle.drain(Instant::now() + Duration::from_millis(10));
        assert_eq!(outcome, DrainOutcome::TimedOut { in_flight: 1 });
        assert!(lifecycle.is_live(), "a timed-out drain must not report a clean stop");
    }
}
```

Record the verdict per gate, with the evidence for each:

| Gate | Result | Evidence |
| --- | --- | --- |
| Startup validation rejects bad configuration | passed, failed, blocked or n/a | command, test or log reference |
| Readiness false before startup and while draining | | |
| Liveness true while draining | | |
| Drain completes within the termination grace period | | |
| Work still running at the deadline is reported | | |

A unit test of the lifecycle is not evidence about the orchestrator's probe
thresholds or grace period; check those against the deployment manifests.

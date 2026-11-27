# A bounded retry loop

Read this when writing or reviewing a retry loop. The example is synchronous
and std-only so the rules stay visible; in async code the same shape uses the
runtime's timer and sleep, and `/async-rust` owns cancellation.

What the loop enforces:

- One overall deadline from the caller. Each attempt receives the time that
  is left, so an attempt cannot outlive the caller's budget.
- A classifier decides retryability. Permanent failures stop at once. An
  ambiguous outcome (the request may have committed) is retried only when
  the operation is idempotent.
- Capped exponential backoff with injected jitter, and no sleep that would
  end past the deadline.
- An injected clock, so tests run without real sleeps and can assert the
  exact attempts and delays.

```rust
use std::cell::Cell;
use std::time::{Duration, Instant};

/// How a failed attempt should be treated.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Failure {
    /// The dependency was unavailable or overloaded; trying again can help.
    Transient,
    /// Validation, authorization or not found; retrying cannot help.
    Permanent,
    /// The request may have taken effect, for example a timeout after sending.
    Ambiguous,
}

pub struct RetryPolicy {
    pub max_attempts: u32,
    pub base_delay: Duration,
    pub max_delay: Duration,
}

#[derive(Debug, PartialEq, Eq)]
pub enum GaveUp<E> {
    Permanent(E),
    /// Not retried because the operation is not idempotent.
    Ambiguous(E),
    Exhausted { attempts: u32, last: E },
    /// The deadline left no room for another attempt. `last` is `None` when
    /// the deadline had passed before the first attempt.
    OutOfTime { attempts: u32, last: Option<E> },
}

pub trait Clock {
    fn now(&self) -> Instant;
    fn sleep(&self, duration: Duration);
}

pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> Instant {
        Instant::now()
    }
    fn sleep(&self, duration: Duration) {
        std::thread::sleep(duration);
    }
}

/// Runs `attempt` until it succeeds or the policy, the classifier or the
/// deadline says stop. `jitter` returns a fraction in `[0, 1]`.
pub fn retry<T, E>(
    policy: &RetryPolicy,
    deadline: Instant,
    idempotent: bool,
    clock: &impl Clock,
    mut jitter: impl FnMut() -> f64,
    mut attempt: impl FnMut(Duration) -> Result<T, (Failure, E)>,
) -> Result<T, GaveUp<E>> {
    let mut attempts = 0;
    let mut last = None;
    loop {
        let remaining = deadline.saturating_duration_since(clock.now());
        if remaining.is_zero() {
            return Err(GaveUp::OutOfTime { attempts, last });
        }
        attempts += 1;
        let (kind, error) = match attempt(remaining) {
            Ok(value) => return Ok(value),
            Err(failure) => failure,
        };
        match kind {
            Failure::Permanent => return Err(GaveUp::Permanent(error)),
            Failure::Ambiguous if !idempotent => return Err(GaveUp::Ambiguous(error)),
            Failure::Transient | Failure::Ambiguous => {}
        }
        if attempts >= policy.max_attempts {
            return Err(GaveUp::Exhausted { attempts, last: error });
        }
        let ceiling = policy
            .base_delay
            .saturating_mul(1 << (attempts - 1).min(16))
            .min(policy.max_delay);
        let delay = ceiling.mul_f64(jitter().clamp(0.0, 1.0));
        if delay >= deadline.saturating_duration_since(clock.now()) {
            return Err(GaveUp::OutOfTime { attempts, last: Some(error) });
        }
        clock.sleep(delay);
        last = Some(error);
    }
}

/// A clock for tests: sleeping advances time instantly and is recorded.
pub struct FakeClock {
    now: Cell<Instant>,
    pub slept: Cell<Duration>,
}

impl FakeClock {
    pub fn new() -> Self {
        Self { now: Cell::new(Instant::now()), slept: Cell::new(Duration::ZERO) }
    }
    pub fn advance(&self, by: Duration) {
        self.now.set(self.now.get() + by);
    }
}

impl Clock for FakeClock {
    fn now(&self) -> Instant {
        self.now.get()
    }
    fn sleep(&self, duration: Duration) {
        self.slept.set(self.slept.get() + duration);
        self.advance(duration);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const POLICY: RetryPolicy = RetryPolicy {
        max_attempts: 4,
        base_delay: Duration::from_millis(100),
        max_delay: Duration::from_secs(1),
    };

    #[test]
    fn transient_failure_is_retried_within_the_budget() {
        let clock = FakeClock::new();
        let deadline = clock.now() + Duration::from_secs(5);
        let mut calls = 0;
        let result = retry(&POLICY, deadline, false, &clock, || 1.0, |_| {
            calls += 1;
            if calls == 1 { Err((Failure::Transient, "unavailable")) } else { Ok("done") }
        });
        assert_eq!(result, Ok("done"));
        assert_eq!(calls, 2);
        assert_eq!(clock.slept.get(), Duration::from_millis(100));
    }

    #[test]
    fn permanent_and_unsafe_ambiguous_failures_are_not_retried() {
        let clock = FakeClock::new();
        let deadline = clock.now() + Duration::from_secs(5);
        let permanent = retry(&POLICY, deadline, true, &clock, || 1.0, |_| {
            Err::<(), _>((Failure::Permanent, "forbidden"))
        });
        assert_eq!(permanent, Err(GaveUp::Permanent("forbidden")));
        let ambiguous = retry(&POLICY, deadline, false, &clock, || 1.0, |_| {
            Err::<(), _>((Failure::Ambiguous, "timed out after send"))
        });
        assert_eq!(ambiguous, Err(GaveUp::Ambiguous("timed out after send")));
        assert_eq!(clock.slept.get(), Duration::ZERO);
    }

    #[test]
    fn never_sleeps_past_the_deadline() {
        let clock = FakeClock::new();
        let deadline = clock.now() + Duration::from_millis(250);
        let result = retry(&POLICY, deadline, true, &clock, || 1.0, |remaining| {
            clock.advance(remaining.min(Duration::from_millis(100)));
            Err::<(), _>((Failure::Transient, "slow"))
        });
        // 100 ms attempt, 100 ms backoff, then a 50 ms attempt uses up the budget.
        assert_eq!(result, Err(GaveUp::OutOfTime { attempts: 2, last: Some("slow") }));
        assert_eq!(clock.slept.get(), Duration::from_millis(100));
        assert!(clock.now() <= deadline);
    }
}
```

The test seam matters as much as the loop: a retry policy that can only be
exercised with real sleeps and a real dependency is a policy nobody verifies.
Choose one retry owner per call chain; if a client library already retries,
configure it rather than wrapping it in a second loop.

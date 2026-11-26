---
name: rust-concurrency
description: Pick the concurrency model from the workload shape — rayon for data parallelism, scoped threads for borrowed stack data, channels for handoff, shared state last — and use the weakest correct atomic ordering. Use when writing or reviewing threaded Rust, when Mutex, RwLock, atomics, or manual Send/Sync appear, when a deadlock or data race is suspected, or when the user asks how to parallelize Rust code.
---

# Rust Concurrency

The shape of the workload picks the model. This skill owns that pick for
threads, and it stops where task concurrency begins — runtime, executors,
`spawn_blocking`, and cancellation live in `/async-rust`.

## The shape picks the model

- The same operation over many independent items: data parallelism, `rayon`.
- Independent units of work that are mostly waiting: task concurrency,
  `/async-rust`, not here.
- State several threads read and write: shared state — the one to reach for
  last when explicit ownership or message passing fits. Any model can deadlock
  through cyclic waits, bounded channels or nested synchronization.

## Data parallelism

`par_iter()` can parallelize independent work, but preserve ordering,
error behaviour, side effects and reduction semantics. Floating-point
reductions can differ when the evaluation order changes. The precondition: the per-item work
has to be large enough to pay for the scheduling. A `par_iter` over a million
cheap closures is often slower, and is the standard disappointment.

## Scoped threads

`std::thread::scope` lets a thread borrow stack data, because the scope
guarantees the join before the stack unwinds — which is what removes the
`'static` bound that otherwise forces an `Arc`:

```rust
fn sum_halves(data: &[u64]) -> u64 {
    let (left, right) = data.split_at(data.len() / 2);
    std::thread::scope(|s| {
        let a = s.spawn(|| left.iter().sum::<u64>());
        let b = s.spawn(|| right.iter().sum::<u64>());
        a.join().unwrap() + b.join().unwrap()
    })
}
```

Reach for a scope before an `Arc` or a clone buys the second thread.

## Channels for handoff

A channel moves ownership with the message, avoiding direct shared mutation.
Dropping all senders signals closure; buffered messages may still be delivered.
Bound queues, define overload and drain policy, and avoid cyclic blocking sends.
Bounded versus unbounded is backpressure: an unbounded channel silently
converts a throughput problem into a memory problem.

## Shared state

The compiler's guarantee is narrower than it feels: `Send`, `Sync`, and the borrow
checker rule out data races in safe code. They do not rule out deadlocks, nor
logic races — two threads each doing a correct step in an order the program did
not intend. Message passing sidesteps most of this, so it is the first choice
before a lock.

`Mutex` is the default; `RwLock` pays off only with genuinely read-heavy
access, and can starve writers. Rules for using a lock well:

- Put data whose parts must stay consistent with each other under one lock. Two
  locks for two halves of one invariant let another thread see them out of sync.
- Hold the guard for the shortest possible scope, and never across a call into
  code that might lock again. That includes invoking a closure or callback while
  the guard is live: the caller decides what it does.
- Do not return a `MutexGuard` to a caller. It leaks the locking discipline across
  an API boundary; return a snapshot or perform a narrowly scoped internal operation. Avoid
  invoking caller-provided callbacks under the guard.
- If two locks must be held together, take them in one agreed order. Fall back to a
  written lock hierarchy only once restructuring to need one lock, or none,
  has failed.

A standard mutex can be poisoned after a panic; poisoning is advisory and
not a guarantee of invariant integrity. `lock()` reports detected poison.
Three positions exist, and which applies depends on what the protected data
looks like after the panic:

| Position | When it applies |
|---|---|
| Propagate the error, or recover with `into_inner()` | Propagate by default. Recover only after verifying or rebuilding protected invariants; document the policy and clear poison if appropriate |
| Never touch the data behind a poisoned lock | The stricter line, for state where a half-finished update could be mistaken for a good one |
| Panic on poison (`lock().unwrap()`, `expect`) | A deliberate stop when the state cannot be trusted and nothing can repair it. Write the reason; it is a decision, not a shortcut |

What is ruled out is the reflexive `unwrap` that was never weighed.

## Libraries and threads

Prefer caller-managed execution. A library may own threads if that is part of
its explicit contract, with bounded resources, a documented lifecycle and a
shutdown/join mechanism; never silently spawn unbounded background work. Take a
closure, an executor handle, or run work on the caller's thread, and let the
binary decide.

## Atomics and orderings

The rule: `Relaxed` for a counter nobody synchronises on, `Acquire`/`Release`
for a paired handoff where one thread publishes and another observes,
`SeqCst` when the algorithm requires a global order. Stronger ordering cannot
repair a broken synchronization protocol; if the proof is unclear, use a lock. The pair is the one that is
wrong most often:

```rust
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;

fn main() {
    let value = Arc::new(AtomicU64::new(0));
    let ready = Arc::new(AtomicBool::new(false));
    let (v, r) = (Arc::clone(&value), Arc::clone(&ready));
    let publisher = std::thread::spawn(move || {
        v.store(42, Ordering::Relaxed);
        r.store(true, Ordering::Release);
    });
    while !ready.load(Ordering::Acquire) {
        std::thread::yield_now();
    }
    assert_eq!(value.load(Ordering::Relaxed), 42);
    publisher.join().unwrap();
}
```

The `Release` store orders the write to `value` before `ready` flips, and
the `Acquire` load pairs with it. If the ordering argument cannot be
written down in two sentences, the code wants a `Mutex`.

## Manual `Send`/`Sync` is an unsafe claim

`unsafe impl Send for T` asserts what the compiler could not prove; the
`// SAFETY:` comment must hold an actual argument. The soundness review
goes to `/unsafe-rust` — this skill only insists the claim is written. It is never a way to silence a `Send` bound error that the code really violates; fix the data crossing the thread instead.

## `thread_local!` over `static mut`

`static mut` is effectively unusable in current editions and was never
sound to share; `thread_local!` is the per-thread answer. Avoid it where one
consistent value across threads is the point — each thread sees its own copy.
Passing state explicitly beats hiding it in a global, which has no visible owner.

## Deferrals

Task concurrency, executors, `spawn_blocking`, and cancellation are
`/async-rust`. Whether the state should be shared at all is
`/ownership-not-clone`. The soundness of an `unsafe impl` is `/unsafe-rust`.
Throughput of the parallel version is `/rust-performance`.

## Verification

```bash
cargo test                    # run relevant ignored stress tests separately when configured
cargo clippy --all-targets    # at the level the repo configures
cargo miri test               # where atomics or unsafe Send/Sync are involved
```

Deadlocks are timing-dependent and rarely fail an ordinary run. Where the code
holds more than one lock, add a deadlock-detection job to CI — for instance
`parking_lot` with its `deadlock_detection` feature polled by a watchdog thread
during the stress tests, or `loom` models of the lock order — so a cycle in the
lock order becomes a red build instead of a production hang.

Clippy runs at the lint level the target repo configures; `-D warnings`
is the fallback only when the repo configures no lints at all. Lock-free
structures and non-trivial ordering arguments want `loom` — it explores interleavings of the bounded model under its configured limits,
not every behaviour of the production system. Follow the repository's Loom
configuration; run stress tests with their actual flags and report bounds and
unexecuted checks. Miri can find bugs in exercised paths, not prove soundness.

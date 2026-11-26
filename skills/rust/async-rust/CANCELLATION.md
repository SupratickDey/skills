# Cancellation safety

The depth for the cancellation section of `SKILL.md`: the precise definition,
the `select!` trap, the common-operation table, timeouts as cancellation, the two
structural fixes, graceful shutdown, cancellation tokens, and `JoinSet`.

## The definition, precisely

For a repeated `select!` loop, cancellation safety means dropping and
recreating a pending future does not lose progress required by the contract.
Dropping invokes synchronous destructors, not asynchronous cleanup; it does not
reverse external effects. Consider cancellation at each suspension point.

## The `select!` trap

`select!` polls enabled branches concurrently on the current task. A matching
completed branch wins; other branch futures are dropped. Branch expressions may
be evaluated even when disabled, so keep construction free of side effects. A branch that takes input and then awaits
something irreversible loses the input when another branch wins:

```rust,ignore
// `queue.pop()` runs when the branch future is built, before the race. If
// shutdown wins, `process` is dropped — and the popped item is gone.
tokio::select! {
    _ = process(queue.pop()) => {}
    _ = shutdown.cancelled() => break,
}
```

Race only cancellation-safe admission, then finish admitted work outside the
race or use an explicitly resumable processor. For example, a Tokio mpsc
receiver preserves a pending message when `recv` loses:

```rust,ignore
loop {
    let item = tokio::select! {
        biased;
        _ = shutdown.cancelled() => break,
        item = queue.recv() => match item {
            Some(item) => item,
            None => break,
        },
    };
    process(item).await?; // finish admitted work before the next cancellation check
}
```

If the entire task is aborted, this still needs durable acknowledgement or a
recovery protocol. Do not move an item into a future and assume a losing branch
can still use it.

The same shape covers any "read, then do something irreversible" branch. And
when a shutdown branch needs priority, `biased;` polls branches in source order.
Put the shutdown branch first and ensure other branches are not starved. Bias
changes polling order, not readiness or preemption.

## Which common operations are safe

| Operation | Cancellation-safe? | Why |
|---|---|---|
| `tokio::time::sleep` | Yes | Dropping the future cancels the timer; nothing was consumed |
| `mpsc::Receiver::recv` | Yes | A dropped `recv` does not take the message; the next `recv` still gets it |
| `AsyncReadExt::read` | Yes | A dropped read leaves the stream where it was; bytes already copied are owned by the caller |
| `AsyncReadExt::read_exact` | No | May consume a prefix before cancellation; restarting against the same reader does not recover the consumed bytes. Use `read` with progress stored outside the future |
| `tokio::sync::Mutex::lock` | No for queue fairness | Cancelling a pending lock loses its position in the FIFO queue; the protected state is not changed by the pending acquisition |
| A database transaction or commit future | Driver and operation dependent | Cancellation may leave an unknown remote outcome; verify driver guarantees and reconcile before retrying |

The pattern in the unsafe rows: the operation has effects outside the future —
on a server, on a connection, on a popped queue — and dropping the future does
not undo those effects.

## Timeouts as cancellation

`tokio::time::timeout` returns an elapsed error when the deadline is observed;
a future that does not yield may exceed it. The pending future is dropped when
its owning timeout is dropped. Timeout does not stop detached or blocking work
or guarantee that a remote operation did not commit. Define recovery and retry
semantics before wrapping a non-cancellation-safe operation.

## The two structural fixes

**Make the irreversible step atomic.** Order the operations so the drop point
sits between things where a retry is harmless — write-then-acknowledge, never
acknowledge-then-write:

```rust,ignore
// The append is irreversible and runs first. A drop between the two loses the
// acknowledgement, not the work — the sender retries, and the append is
// idempotent on the job id.
async fn submit(job: Job) -> Result<()> {
    let id = job.id();
    durable.append(job).await?;
    ack.send(id).await
}
```

**Make the operation resumable.** Keep an explicit checkpoint — which items are
done, where the frame ends, which statement the transaction is on — so a
dropped future can be restarted from the checkpoint instead of from zero. The
checkpoint is data the caller owns, not state inside the future.

## Graceful shutdown

`CancellationToken` (from `tokio_util`) or a `watch` channel is the standard
shape: every long-lived task selects its work against the token, and shutdown
cancels the token once. The failure mode this prevents is the one where a
spawned task ignores shutdown and keeps running past it — when the runtime
shuts down, the task is dropped at its current await point, which is exactly an
uncontrolled cancellation of whatever it was mid-flight on. A token is a cooperative signal, not cleanup by itself. Stop admission,
finish or checkpoint admitted work, flush durable state, close resources and
join workers within an explicit shutdown budget. Escalate to abort only under
a documented recovery policy; started blocking tasks need a separate stop plan.

## Cancellation tokens

Mechanically, the token is a shared flag with a `.cancelled()` future, so a task
selects it alongside its real work and shuts down at a point it chose, with
cleanup running on the way out. The contrast is dropping a `JoinHandle`: that detaches the task; it does not cancel it.
Call `abort` for an async task when justified, then await its handle to observe
termination. Synchronous destructors run when the future is dropped, but
async cleanup is not guaranteed. `spawn_blocking` cannot be aborted once started. To cancel a subtree of tasks, derive child tokens
from the parent (`child_token()`); cancelling the parent then cancels every
child. And the rule that bounds the whole approach: a token check is only as
good as the interval between checks — a worker that checks once a second cannot
stop mid-second, so the interval must stay shorter than the deadline the
shutdown actually has.

```rust,ignore
// Only race work that is safe to cancel; cleanup then runs explicitly.
tokio::select! {
    result = do_work() => result,
    _ = token.cancelled() => cleanup().await,
}
```

## JoinSet

`JoinSet` for a dynamic group of tasks: completion is observed as it happens,
and dropping the set requests abort of its remaining async tasks. For graceful
shutdown, signal and join the workers; `abort_all` followed by draining joins
is the forced path. Do not confuse this with dropping an individual handle.

# Rust standard library sources

## idiomatic-rust: traversal, conversion and ordering

- [Iterator::zip](https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.zip): iteration stops when either input is exhausted.
- [Slice::get](https://doc.rust-lang.org/std/primitive.slice.html#method.get): checked access returns an option; indexing can panic.
- [From](https://doc.rust-lang.org/std/convert/trait.From.html): conversions should be infallible, lossless, value-preserving and obvious.
- [PartialOrd](https://doc.rust-lang.org/std/cmp/trait.PartialOrd.html): partial comparison can return None; comparison implementations must agree.
- [Ord](https://doc.rust-lang.org/std/cmp/trait.Ord.html): total ordering requires consistent equality and partial ordering.
- [Cargo features](https://doc.rust-lang.org/cargo/reference/features.html): choose checks for supported feature configurations.

## Async and thread concurrency

- [Tokio select](https://docs.rs/tokio/latest/tokio/macro.select.html): polling, cancellation safety and fairness.
- [Tokio JoinHandle](https://docs.rs/tokio/latest/tokio/task/struct.JoinHandle.html): detaching versus aborting and observing termination.
- [Tokio spawn_blocking](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html): bounded concurrency and non-abortable started work.
- [Tokio Mutex](https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html): lock choice, FIFO and cancelled waits.
- [Rust atomic Ordering](https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html): ordering contracts.

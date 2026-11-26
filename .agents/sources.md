# Rust standard library sources

## ownership-not-clone: ownership and clone semantics

- [Clone](https://doc.rust-lang.org/std/clone/trait.Clone.html): clone semantics depend on the implementation; reference-counted handles can share state.
- [Arc](https://doc.rust-lang.org/std/sync/struct.Arc.html): atomic reference counting and conditional Send/Sync.
- [Lifetime bounds](https://doc.rust-lang.org/reference/trait-bounds.html#lifetime-bounds): distinguish reference lifetime and type outlives bound.
- [Mutex](https://doc.rust-lang.org/std/sync/struct.Mutex.html): synchronization and poisoning.

## idiomatic-rust: traversal, conversion and ordering

- [Iterator::zip](https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.zip): iteration stops when either input is exhausted.
- [Slice::get](https://doc.rust-lang.org/std/primitive.slice.html#method.get): checked access returns an option; indexing can panic.
- [From](https://doc.rust-lang.org/std/convert/trait.From.html): conversions should be infallible, lossless, value-preserving and obvious.
- [PartialOrd](https://doc.rust-lang.org/std/cmp/trait.PartialOrd.html): partial comparison can return None; comparison implementations must agree.
- [Ord](https://doc.rust-lang.org/std/cmp/trait.Ord.html): total ordering requires consistent equality and partial ordering.
- [Cargo features](https://doc.rust-lang.org/cargo/reference/features.html): choose checks for supported feature configurations.

## Performance and selective migration

- [fast-anything README](https://github.com/EL4CTEO/fast-anything/blob/bca1c15ad90efec263a6b3f3479a6d9843ac325b/README.md) and [skill](https://github.com/EL4CTEO/fast-anything/blob/bca1c15ad90efec263a6b3f3479a6d9843ac325b/skills/fast-anything/SKILL.md): inspiration for measured hotspot selection, held-out replay, reversible activation and A/A controls. Independently worded guidance; no dependency or claimed benchmark transfer.
- [Rust Iterator](https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.zip): unequal lengths terminate zip early.
- [Rust Cargo profiles](https://doc.rust-lang.org/cargo/reference/profiles.html): release and benchmark build settings.
- [Rust f64](https://doc.rust-lang.org/std/primitive.f64.html): floating-point special values and comparison semantics.

## Panic safety and FFI

- [Rust Reference: panic](https://doc.rust-lang.org/reference/panic.html): abort and unwind strategies, foreign unwinding.
- [Rust Reference: functions and ABI](https://doc.rust-lang.org/reference/items/functions.html): non-unwinding and unwinding ABI behaviour.
- [Rustonomicon: FFI](https://doc.rust-lang.org/nomicon/ffi.html): interoperable unwind boundaries.
- [catch_unwind](https://doc.rust-lang.org/std/panic/fn.catch_unwind.html): unwind-only handling, panic hooks, payload lifetime and foreign exception limits.

## Async and thread concurrency

- [Tokio select](https://docs.rs/tokio/latest/tokio/macro.select.html): polling, cancellation safety and fairness.
- [Tokio JoinHandle](https://docs.rs/tokio/latest/tokio/task/struct.JoinHandle.html): detaching versus aborting and observing termination.
- [Tokio spawn_blocking](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html): bounded concurrency and non-abortable started work.
- [Tokio Mutex](https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html): lock choice, FIFO and cancelled waits.
- [Rust atomic Ordering](https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html): ordering contracts.

## Dependency and supply-chain risk

- [Cargo resolver](https://doc.rust-lang.org/cargo/reference/resolver.html): version unification, feature resolution, MSRV and yanked releases.
- [Cargo build](https://doc.rust-lang.org/cargo/commands/cargo-build.html): locked builds and target/feature selection.
- [Cargo build scripts](https://doc.rust-lang.org/cargo/reference/build-scripts.html): build-host execution.
- [RustSec](https://rustsec.org/): advisory database scope.
- [cargo-deny checks](https://embarkstudios.github.io/cargo-deny/checks/index.html): advisories, licenses, bans and sources, with default configuration.
- [cargo-deny common options](https://embarkstudios.github.io/cargo-deny/cli/common.html): no-fetch and lockfile behaviour.

## Runtime configuration and focused debugging

- [std::env::var](https://doc.rust-lang.org/std/env/fn.var.html) and [Rust 2024 newly unsafe functions](https://doc.rust-lang.org/edition-guide/rust-2024/newly-unsafe-functions.html): missing versus invalid Unicode and process environment mutation.
- [Serde container attributes](https://serde.rs/container-attrs.html): validated conversion and unknown-field policies.
- [Rust API Guidelines: dependability](https://rust-lang.github.io/api-guidelines/dependability.html): input validation and predictable failure.
- [OWASP secrets management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html): secret lifecycle, access and redaction.

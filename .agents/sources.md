# Rust standard library sources

## idiomatic-rust: traversal, conversion and ordering

- [Iterator::zip](https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.zip): iteration stops when either input is exhausted.
- [Slice::get](https://doc.rust-lang.org/std/primitive.slice.html#method.get): checked access returns an option; indexing can panic.
- [From](https://doc.rust-lang.org/std/convert/trait.From.html): conversions should be infallible, lossless, value-preserving and obvious.
- [PartialOrd](https://doc.rust-lang.org/std/cmp/trait.PartialOrd.html): partial comparison can return None; comparison implementations must agree.
- [Ord](https://doc.rust-lang.org/std/cmp/trait.Ord.html): total ordering requires consistent equality and partial ordering.
- [Cargo features](https://doc.rust-lang.org/cargo/reference/features.html): choose checks for supported feature configurations.

## Panic safety and FFI

- [Rust Reference: panic](https://doc.rust-lang.org/reference/panic.html): abort and unwind strategies, foreign unwinding.
- [Rust Reference: functions and ABI](https://doc.rust-lang.org/reference/items/functions.html): non-unwinding and unwinding ABI behaviour.
- [Rustonomicon: FFI](https://doc.rust-lang.org/nomicon/ffi.html): interoperable unwind boundaries.
- [catch_unwind](https://doc.rust-lang.org/std/panic/fn.catch_unwind.html): unwind-only handling, panic hooks, payload lifetime and foreign exception limits.

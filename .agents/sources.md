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

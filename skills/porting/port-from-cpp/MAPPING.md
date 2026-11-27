A row in this table is a starting point, not a rewrite rule: the third
column names the decision the row hides, and the decision is made per
site, with the source in front of you. The C++ corollary: where the
behaviour was undefined, there is no row — there is a contract
decision.

| C++ | Rust | The decision |
|---|---|---|
| `class` / `struct` | `struct` + `impl` | Whether invariants were maintained by the constructor — `/type-driven-design` |
| Constructor | `fn new` | Whether it could throw; if so, `Result` |
| Destructor | `Drop` | Whether cleanup can fail; `Drop` cannot return an error |
| Copy constructor | `Clone` | Whether copying was deep, shallow, or expensive |
| Move constructor | Rust move (no hook) | Whether anything read the moved-from object |
| `operator=` | Assignment, or a method | Self-assignment handling, which Rust does not need |
| Operator overloading | `std::ops` traits | Whether the operator had surprising semantics |
| `virtual` method | `dyn Trait` | Whether dispatch is genuinely dynamic; a fixed set is an enum |
| Abstract base class | `trait`, or `enum` | Fixed derived set means enum — `/type-driven-design` |
| Multiple inheritance | Composition | No mapping exists; the design is redone |
| `friend` | Module privacy | Rust privacy is module-scoped, which is usually a better fit |
| Template function | Generic with bounds | The real bound, which the template left implicit |
| Template class | Generic struct | Same |
| Template specialization | nonoverlapping impls or explicit dispatch | Preserve behavior under stable coherence rules; arbitrary overlapping specialization is unavailable |
| CRTP | Trait, or generic | Usually a plain trait |
| SFINAE / concepts | Trait bounds | The bound the source actually required |
| Template metaprogramming | Macro, build script, or plain code | Whether the compile-time computation is still needed |
| `unique_ptr<T>` | native owning handle or Rust Box | Preserve nullable state, custom deleter, allocator and ownership transfer; Box is not a foreign allocator adapter |
| `shared_ptr<T>` | native shared handle or Rust Arc/Rc | Preserve aliasing constructors, control-block identity, deleter and synchronization; reference counting alone does not make T thread-safe |
| `weak_ptr<T>` | `Weak<T>` | Whether the cycle it broke should exist at all |
| Raw pointer (owning) | explicit owning wrapper | Prove allocator and destruction contract before conversion; never assume Box::from_raw is compatible |
| Raw pointer (borrowing) | verified borrow or opaque raw handle | Prove validity, lifetime, alignment, initialization and aliasing before creating references |
| Reference `T&` | `&T` / `&mut T` | Whether it could dangle |
| `const T&` | verified shared borrow or native handle | const does not preclude mutable members or mutation through another alias |
| `std::vector` | `Vec<T>` | Reserve behaviour if it was load-bearing for pointers |
| `std::array` | `[T; N]` | Nothing hidden |
| `std::string` | `String` / `&str` | `std::string` is bytes with no encoding guarantee; non-UTF-8 content needs `Vec<u8>` or a lossy decision |
| `std::string_view` | `&str` / `&[u8]` | Same encoding question, plus lifetime |
| `std::map` | `BTreeMap` | The comparator, if custom |
| `std::unordered_map` | `HashMap` | Iteration order, and hasher differences if hashes leaked into output |
| `std::set` / `unordered_set` | `BTreeSet` / `HashSet` | Same |
| `std::optional` | `Option<T>` | The clean row |
| `std::variant` | enum with necessary state | Preserve valueless_by_exception and visitation behavior where observable |
| `std::any` | An enum | The set of types that actually reach the site |
| `std::function` | appropriate Fn/FnMut/FnOnce or native wrapper | Preserve empty state, copyability, capture lifetime, invocation and exception behavior |
| Lambda | Closure | Capture by reference versus by value, which Rust makes explicit |
| Iterator pair | `Iterator` / slice | Whether the range was half-open and validated |
| `std::algorithm` | Iterator adaptors | Nothing hidden; shape is `/idiomatic-rust` |
| Exception / `throw` | `Result` + `?` | The error taxonomy — `/rust-errors` |
| `noexcept` | explicit failure contract | Non-throwing functions may return errors; preserve termination behavior and never equate noexcept with success |
| RTTI / `dynamic_cast` | Enum + `match` | The downcast set, which becomes explicit |
| `std::thread` | `std::thread` | Nothing hidden |
| `std::mutex` | `Mutex<T>` | Rust guards data, so fields move inside the mutex |
| `std::atomic` | `std::sync::atomic` | Memory ordering, which both expose and neither defaults safely |
| Preprocessor macro | `const`, `fn`, or `macro_rules!` | Whether the macro was a value, a function, or a code generator |
| `#ifdef` | `#[cfg(...)]` | Which combinations are actually built |
| Namespace | Module | Nothing hidden |
| Header / source split | One module | What was public, which headers stated and modules must restate |

## The rows that are traps rather than mappings

- `shared_ptr` used as a default — usually `Box` or a borrow.
- Any type that relies on a stable address across moves —
  self-referential structures need arenas, indices, or pinning, and the
  design is redone rather than translated.
- Any construct whose behaviour was undefined — no mapping, a contract
  decision, recorded.

## Additional compatibility checks

- A C++ move is overload resolution, not guaranteed ownership transfer.
  Preserve user-defined copy/move effects and specified post-move states.
- C++ long and size_t depend on the target data model; use verified widths
  and C ABI types instead of assuming LP64 on Windows.
- Preserve destruction sequencing, failed construction and exception safety.
  Rust field drop order differs from C++ member destruction order.
- Custom comparators can define key equivalence independently of equality.
  Preserve the actual ordering and equivalence before choosing BTreeMap.

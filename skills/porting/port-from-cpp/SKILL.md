---
name: port-from-cpp
description: Port C++ into Rust — RAII and smart pointers onto ownership, templates onto generics and traits, exceptions onto Result, the STL onto Rust collections, and the traps (move semantics, implicit conversions, undefined behaviour, iterator invalidation). Use when porting, rewriting, or migrating C++, a C++ library, or a C++ application into Rust, when replacing a C++ module with Rust behind the existing build, or when the user asks how a C++ construct such as unique_ptr, shared_ptr, a template, or an STL container translates to Rust.
---

# Port from C++

## A construct mapping and a boundary, nothing else

This skill maps C++ to Rust and owns the C++ boundary. The parity
contract, the five phases, and the anti-patterns are `/port-to-rust`,
which runs first and stays running through the port. C is a separate
skill — the mechanics overlap, the idioms do not — so a C codebase
with a `.cpp` extension is still `/port-from-c` territory in everything
but the build.

## The end state, and the C++ default

`/port-to-rust` names three end states. In C++ terms: A, a standalone
Rust binary or library replacing the C++ entirely; B, a Rust core with
a permanent C++-callable surface, real when the deliverable is a
library other C++ code links; and C, a bridge that carries the
migration module by module and is deleted at cut-over. C is a candidate for incremental migration when the existing build and
ownership boundaries support it. A process seam or standalone replacement
may be simpler. Choose from the approved end state and measured costs. The bridge is disposable scaffolding that must
still be *sound*, and that tension is what this skill manages; the
mechanics are in `BOUNDARY.md`.

## The traps that break parity silently

The body carries these five because each one produces a port that
passes a naive test suite and is wrong; the full table is `MAPPING.md`.

| Trap | What actually differs |
|---|---|
| Undefined behaviour was doing something | Signed overflow, invalid aliasing, invalid uninitialized reads and out-of-bounds accesses can be undefined in C++. Rust safe code excludes many memory-safety violations, but unsafe Rust has its own undefined behavior and integer overflow depends on the operation and build policy. Any behaviour the source got from UB is behaviour the port cannot reproduce and must not try to — it is found, recorded, and decided, and it is one of the few legitimate reasons for a port to differ from its source |
| Move semantics are not the same move | C++ move operations may invoke user-defined code; the source remains an object whose post-move contract depends on its type. Rust ownership transfer does not invoke a move constructor. Preserve observable move effects, moved-from states and address-sensitive invariants explicitly |
| Implicit conversions | C++ converts between numeric types, applies integer promotion, and calls converting constructors without a cast. Rust requires every conversion to be written, so a port surfaces conversions the source never made visible — and each one is a place a value could have been truncated silently |
| Iterator and reference invalidation | A `push_back` may reallocate and invalidate every outstanding iterator and reference; C++ tolerates the pattern until it does not. Rust rejects the pattern at compile time, so the port must restructure — usually with indices — and the restructuring is where the design gets clearer, not where it gets worse |
| Exceptions cross layers invisibly | An exception propagates through frames that never mention it, including destructors that run on the way out. Mapping to `Result` makes every propagation point visible and surfaces error paths the source never named — `/rust-errors`. Note the `noexcept` boundary: noexcept constrains exception escape, not fallibility. Preserve status returns and failure behavior; a violating exception can terminate the process |

## Mapping, in one line

`MAPPING.md` holds the full table; a row is a starting point, not a
rewrite rule. Where the source behaviour was undefined there is no
row — there is a contract decision.

## RAII maps, and this is the good news

Map ownership, not pointer spelling. Destructors may map to Drop; native
unique_ptr and shared_ptr can retain custom deleters, allocator obligations
and object identity. Box, Arc, Rc and Weak are candidates for Rust-owned
values only when their ownership contracts match. C++ references do not
prove Rust lifetimes or exclusive borrowing; const is not proof of Rust
shared-reference immutability.
Reach for `Arc`/`Rc` only where the C++ genuinely shared ownership,
not everywhere a `shared_ptr` appeared — `shared_ptr` is often used
where a `unique_ptr` or a plain reference would have done, and
copying that habit into Rust produces the reference-counted soup
`/ownership-not-clone` exists to prevent. `Drop` cannot fail, so a
destructor that could throw becomes an explicit `close()`/`finish()`
returning `Result`.

## Templates are generics until they are not

Simple templates map to generics with trait bounds; SFINAE and
concepts map to bounds; CRTP usually maps to a plain trait; template specialization may require explicit dispatch, concrete wrappers
or another stable representation. Rust coherence rules do not permit
arbitrary overlapping impls; do not depend on unstable specialization. Where a template was doing
compile-time computation or reflection, the honest answer is often a
macro or a build script — a template metaprogram is usually
reimplemented rather than translated. Multiple inheritance and virtual
bases have no mapping and become composition.

## The test suite is the corpus, and the sanitizers are evidence

A GoogleTest or Catch2 suite is characterization input: the cases are
inputs, the assertions are the recorded behaviour. Run supported ASan, UBSan and separate TSan configurations on representative
source paths. Findings are evidence of defects, not an exhaustive inventory
of undefined behavior. Passing sanitizers do not prove soundness. Run it before any Rust
exists — the characterization pass of `/port-to-rust`; harness shapes
are `/rust-testing`.

## Ownership, cleanup and observable behavior

Inventory allocation/deallocation pairs, custom deleters, borrowed storage,
reference-count control blocks and aliasing shared_ptr instances. The
stored pointer can differ from the owned allocation. Do not construct Box
or Arc from an arbitrary foreign pointer. Keep destruction on the owning
side with a verified native destructor or paired release function. Check
nullability, lifetime, thread affinity and callback ownership.

Preserve destruction order, partial construction cleanup, copy/move side
effects and exception guarantees. C++ locals generally destroy in reverse
construction order; Rust fields drop in declaration order. Explicitly
model required ordering, fallible close and rollback. Do not assume Drop
runs on abort, termination or a deliberate leak. Keep moved-from behavior
where the source specifies it; use explicit states or replacement values
rather than reading moved Rust values.

For address-sensitive types, first consider indices or stable owning
allocations. Pin is a contract, not automatic lifetime or aliasing safety;
establish initialization, immovability, projection and destruction
invariants where pinning is justified. Preserve iterator invalidation
contracts and object identity without unsafe aliases.

## Numeric and type boundaries

Inspect the source C++ standard, target data model and compiler flags.
Preserve signedness, integer promotions, unsigned modulo arithmetic,
narrowing and floating-point behavior only for defined inputs. Do not
treat signed overflow or invalid shifts as required parity. Record and
obtain agreement on behavior for formerly undefined inputs. Preserve
comparison and hash equivalence, custom ordering, binary strings,
variant valueless states and callback invocation semantics when observable.
Use stable Rust traits and explicit dispatch where specialization,
overloads or multiple inheritance do not map directly.

## Verification

Both sides:

```bash
cargo test
cargo clippy --all-targets   # add -- -D warnings only if no lint policy exists
ctest            # or the existing C++ test command — the source still passes while both run
```

Plus the source-side sanitizer run (`-fsanitize=address,undefined`),
whose findings belong in the contract as behaviour that is explicitly
not reproduced. Then the differential run over the recorded corpus,
reported with its denominator, plus the corpus requirement: at least
one case per trap — an input at a signed-overflow boundary, a
container operation that would have invalidated an iterator, a
narrowing conversion, and an input that threw.

Select supported packages, features, targets and source compiler settings.
Run Miri on supported Rust-only paths when available, not as a substitute
for executing native C++. Exercise actual native bridge ownership, callbacks,
exception translation, null and boundary values, cleanup and concurrent use.
Run supported sanitizer configurations on native integration paths, with
ThreadSanitizer separately from AddressSanitizer. Compare fresh artifacts
and report denominator, differences and blocked checks. Never claim that
passing dynamic checks prove ABI compatibility or soundness.

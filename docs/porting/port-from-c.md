## What it does

Maps C constructs to Rust and carries the mechanics of the seam — a
C-callable surface under end states B and C, a process boundary under A.
The defining constraint: it recovers the ownership, lifetime, nullability,
length, and encoding that C never recorded, and turns each into a type. C
states almost nothing the port needs — ownership, lifetime, nullability, and
array length are conventions in comments — so a C port is largely an exercise
in recovering intent from a language that never recorded it, with every
process question deferred to `/port-to-rust`.

## When to reach for it

Model-invoked: the agent pulls this in when C is moving into Rust — a C
library, firmware, or a C application being replaced, or C modules being
replaced one at a time behind the existing build — and the question is what a
C construct becomes, or how the boundary works. It does not cover C++
codebases — RAII, templates, and the STL are `/port-from-cpp` — how a port is
run (`/port-to-rust`), the differential harness (`/rust-testing`), the
`unsafe` discipline of the shim (`/unsafe-rust`), or the shape of the Rust
that comes out (`/idiomatic-rust` and the other craft skills). The user can run
it directly, as `/port-from-c`.

## Prerequisites

A buildable C implementation with its test command, a Cargo project, and a
decided end state — `/port-to-rust` is run first, because whether a permanent
C-callable surface exists at all is settled there. Plus a sanitizer run over
the source before phase 3, so the behaviour the source does not have is
recorded in the contract before the port starts.

## What C never said

| Trap | What C never recorded |
|---|---|
| Ownership | A `T*` may be owned, borrowed, or static. Determine the actual allocation owner, matching release operation, lifetime and aliasing rules. An owning foreign pointer is not automatically a Box; a non-owning pointer is not automatically a Rust reference. |
| Lifetime | How long a returned pointer stays valid is convention. A function returning a pointer into a static buffer, into the argument, or into freshly allocated memory all look identical in the header, and each maps to a different Rust signature |
| Nullability | Preserve the documented null contract with raw pointers at the ABI. Convert to Option or references only after establishing the relevant validity and lifetime invariants. |
| Length | Arrays decay to pointers, so length travels separately, in a second parameter, in a struct field, in a NUL terminator, or by convention. Each of these is a different Rust type, and getting it wrong is the classic C bug the port is supposed to eliminate |
| Encoding and validity | `char*` is bytes. It may be UTF-8, some other encoding, or arbitrary binary. Use CStr/CString only for valid NUL-terminated contracts. Preserve explicit-length binary data, embedded NUL and encoding behavior; lossy conversion requires an approved contract |

## The boundary: bindgen in, cbindgen out

Use the approved generators and target compiler configuration. Generated
declarations are not proof of safety. Keep raw pointers at the ABI and
establish allocation ownership, provenance, validity, lifetime, alignment
and aliasing before producing references. Preserve exact calling
conventions, status codes, errno and output initialization. Use the correct
export attribute for the Rust edition. Keep foreign unwinding and longjmp
out of Rust frames; catch_unwind cannot catch aborts. Verify actual native
artifacts and callbacks on supported targets before claiming compatibility.

## Representation and resource ownership

Preserve allocator/free pairing, realloc failure, null/zero-length behavior,
flexible array members, integer promotions and defined arithmetic.
Validate discriminators before reading union arms. repr(C) does not alone
prove bitfield, packed or wire compatibility; verify size, alignment and
offsets. Use appropriate volatile/device access for embedded targets,
not ordinary references or volatile as a synchronization substitute.
Unregister callbacks and drain in-flight invocations before freeing context.
Preserve cleanup order and report native, Miri and hardware checks separately.

## Common questions

**Why are C and C++ separate skills?** The migration mechanics are nearly
identical — FFI first, a Rust `staticlib` linked into the existing build,
leaf modules first, generated headers — but the idiom mapping does not share:
C++ brings RAII, templates, exceptions, and the STL, none of which C has, and
C brings manual `malloc`/`free` lifetimes, raw pointers, unions, and
preprocessor macros. A codebase using RAII, templates, or the STL is
`/port-from-cpp` even when it compiles as C.

**Should the port use a C-to-Rust transpiler?** Only as a checkpoint, never
as the port. Transpiled output compiles, but it is entirely `unsafe` and
shaped exactly like the C; it is refactored away module by module with the
differential harness green throughout, and stopping there is the
transliteration anti-pattern in its most extreme form.

**What happens to goto cleanup?** Use explicit ownership, guards and fallible
cleanup where appropriate. Verify sequencing, partial initialization and
error precedence; Rust drop order is not automatically equivalent.

**How do you handle a `char*` that is not UTF-8?** It is bytes, not a
string: `&[u8]` end to end, `CStr`/`CString` only where the C side needs a
NUL-terminated view, and an explicit decision — validate, convert lossily, or
keep bytes — recorded before anything becomes a `String`.

**Is the exported header public API?** Under end state B, yes: the library
and its generated header ship together, the header is version-controlled
rather than generated-only, and compatibility changes require review. Under A no language bridge is
created; under C the temporary header is removed at cut-over.

## It's working if

- The end state was chosen before any Rust was written.
- An empty exported function linked and ran from the C test suite before any
  logic moved.
- Every generated `bindgen` type is wrapped in a safe module rather than used
  raw.
- Every pointer parameter has a documented caller contract, and every
  `unsafe` block a `// SAFETY:` comment.
- Supported Rust-only Miri checks and actual native C integration are
  reported separately.
- No panic can cross into C.
- Internal enum conversions preserve validated tags and native ABI layout.
- Sanitizer findings are recorded in the contract as non-reproduced
  behaviour.

## Where it fits

`port-from-c` is the C member of the per-language porting skills: it owns the
construct mapping and the bindgen/cbindgen boundary, and defers everything
common to a port to `/port-to-rust`, the harness mechanism to
`/rust-testing`, the `unsafe` discipline of the shim to `/unsafe-rust`, the
error taxonomy to `/rust-errors`, the tag-plus-union rewrite to
`/type-driven-design`, and the public surface under end state B to
`/rust-api-design`. Its neighbour first is `/port-from-cpp`, which owns the
RAII, templates, and STL codebase even when it compiles as C; the other
per-language skills share its three-file shape but carry different traps and
a different boundary. See `rust-skills-map` for how the full set relates.

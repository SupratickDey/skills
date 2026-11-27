---
name: port-from-c
description: Port C into Rust — recovering the ownership, lifetime, nullability, and length that C never recorded, mapping pointers to references and slices, tag-plus-union to enums, return codes and errno to Result, and linking Rust into the existing build with bindgen and cbindgen. Use when porting, rewriting, or migrating C, a C library, firmware, or a C application into Rust, when replacing C modules one at a time behind the existing build, or when the user asks how a C construct such as malloc, a char pointer, a union, or a preprocessor macro translates to Rust.
---

# Port from C

## A construct mapping and a boundary, nothing else

This skill maps C semantics and owns the C boundary; the parity contract, the
five phases, and the anti-patterns are `/port-to-rust`, which runs first and
stays running through the port. C++ is a separate skill — a codebase using
RAII, templates, or the STL is `/port-from-cpp` even when it compiles as C.

## The end state, and why C is almost always C

`/port-to-rust` names three end states; in C terms: A, a standalone Rust
binary or library that replaces the C entirely; B, a Rust core with a
permanent C-callable surface — the right end state when other C code links
this library and will keep doing so; and C, an FFI seam that carries the
migration module by module, deleted at cut-over. Choose the end state from actual consumers, deployment and migration scope.
A has no language bindings; B retains a public C interface; C uses a temporary
bridge. Do not introduce FFI when an existing process seam suffices. Seam mechanics: `BOUNDARY.md`.

## The traps, which are all the same trap: C did not say

Each one breaks parity silently; the full table is `MAPPING.md`.

| Trap | What C never recorded |
|---|---|
| Ownership | A `T*` may be owned, borrowed, or static. Determine the actual allocation owner, matching release operation, lifetime and aliasing rules. An owning foreign pointer is not automatically a Box; a non-owning pointer is not automatically a Rust reference. |
| Lifetime | How long a returned pointer stays valid is convention. A function returning a pointer into a static buffer, into the argument, or into freshly allocated memory all look identical in the header, and each maps to a different Rust signature |
| Nullability | Preserve the documented null contract with raw pointers at the ABI. Convert to Option or references only after establishing the relevant validity and lifetime invariants. |
| Length | Arrays decay to pointers, so length travels separately, in a second parameter, in a struct field, in a NUL terminator, or by convention. Each of these is a different Rust type, and getting it wrong is the classic C bug the port is supposed to eliminate |
| Encoding and validity | `char*` is bytes. It may be UTF-8, some other encoding, or arbitrary binary. Use CStr/CString only for valid NUL-terminated contracts. Preserve explicit-length binary data, embedded NUL and encoding behavior; lossy conversion requires an approved contract |

## Mapping, in one line

`MAPPING.md` holds the full table; a row is a starting point, not a rewrite
rule. The C corollary: nearly every row hides a decision C never recorded,
so the table is a set of questions, not a translation.

## Tag plus union is an enum, and that is the win

The C idiom of a struct holding a `kind` field and a union of payloads maps
to a Rust enum with data, and the translation makes an entire class of bug
unrepresentable — reading the wrong union arm. That single rewrite is usually
the largest correctness gain in a C port, and it is `/type-driven-design`.
Use an enum internally when the source has a defined discriminator. At an
ABI boundary preserve the native layout and validate the integer tag before
accessing the selected union field. For untagged storage inspect the actual
representation and access contract; not every C union is a tagged sum.

## Return codes, `errno`, and macros

A function returning `0`/`-1` with the real value written through an
out-parameter maps to `Result<T, E>` returning the value directly; the
mapping is mechanical, the judgment is the error taxonomy, which is
`/rust-errors`. Capture errno immediately after a documented failure when the API uses it;
success does not imply errno was cleared. Preserve return codes, output
initialization and errno at public C boundaries where required.

A macro defining a constant becomes a `const`; a function-like macro becomes
a function (often `const fn`, and the port gets type checking it never
had); a macro generating code becomes `macro_rules!` or a build script.
Conditional compilation maps to `#[cfg(...)]` and features — enumerate
which combinations are actually built, because an untested configuration is not proof of dead code. Verify the
approved supported matrix before removing a conditional branch.
Macro-heavy C is where a transpiled port produces its worst output.

## The test suite is the corpus, and the sanitizers are evidence

C suites are typically the thinnest in this set, so the corpus usually has
to be built rather than found — authorized sanitized inputs or a fuzzer over the input grammar. Run supported
ASan and UBSan configurations on the source where available; findings expose
defects on executed paths, not all undefined behavior. Agree on defined
replacement behavior for formerly invalid inputs before claiming parity.
Harness shapes are `/rust-testing`.

## Global mutable state, and manual cleanup

File-scope `static` mutables map to `OnceLock`, `LazyLock`, or an explicit
context struct threaded through — the last being both the most work and the
actual improvement. Use explicit ownership and cleanup guards where they preserve the cleanup
sequence. Preserve fallible cleanup and partial initialization. Do not allow
longjmp across Rust frames; isolate it within an appropriate C boundary or
agree to a redesign. Signal handlers must obey async-signal-safe restrictions;
use an existing supported signal mechanism and perform ordinary work outside
the handler.

## Pointer and allocation contracts

Inventory each pointer's allocation, valid range, alignment, initialization,
provenance, ownership, access permissions and lifetime. A null check or a
numeric address range cannot prove a pointer is valid. Do not construct Rust
references until their validity and aliasing requirements hold for the entire
borrow. Preserve volatile, atomic and device access separately; do not create
ordinary references to memory-mapped registers merely to make code compile.

For pointer-plus-length input distinguish bytes from elements, use checked
size calculations, and enforce slice limits and single-allocation provenance.
A null pointer with zero length may be accepted by a C contract but cannot
be passed directly to Rust slice::from_raw_parts. Handle it before creating a
slice. Mutable slices require exclusive access; overlapping input/output
buffers require an explicit compatible strategy, not conflicting references.
Do not return borrowed views of temporary or freed storage.

Use paired allocation and release functions for foreign-owned memory.
Preserve malloc/calloc alignment and initialization requirements, realloc
failure and zero-size behavior for the actual C standard and implementation.
Do not use Box::from_raw or Vec::from_raw_parts without establishing their
specific allocator, layout, initialized length and capacity contracts.
Successful realloc can invalidate all old interior pointers.

## Representation and embedded targets

Inspect C standard, compiler flags, target data model, signed char policy,
integer promotions and implementation-defined conversions. Preserve defined
unsigned arithmetic, shifts and error behavior; never reproduce signed
overflow, invalid shifts or out-of-bounds operations as required parity.
Flexible array members require the actual allocation extent and element
alignment; a header-sized Rust struct does not describe the trailing data.
Check bitfields, packing, padding, endian order, discriminants and offsets.
Do not read uninitialized padding as ordinary initialized bytes or treat
repr(C) as a portable serialization format.

For firmware or no_std targets preserve approved interrupt, DMA, MMIO,
allocator, panic and startup contracts. Volatile access is not atomic or a
memory barrier. Validate register widths, ordering and hardware-specific
requirements using the existing HAL or reviewed native adapter. Do not
introduce std, a heap or a new runtime without an approved target change.

## Verification

Both sides:

```bash
cargo test
cargo clippy --all-targets   # add -- -D warnings only if no lint policy exists
make check       # or the existing C test command — the source still passes while both run
```

Plus the source-side sanitizer run (`-fsanitize=address,undefined`), whose
findings go in the contract as behaviour not reproduced. Then the
differential run, reported with its denominator, plus the C-specific corpus
requirement: a null pointer where one is permitted, a zero-length buffer, a
non-NUL-terminated or non-UTF-8 string, an input at an integer-overflow
boundary, and every error return path the source can produce — the part a C
suite almost never covers.

Select supported features, targets and toolchains. Run Miri on supported
Rust-only paths when available; execute native C integration separately.
Test null/zero-length contracts, overlap, allocation failure, callback
teardown, unknown tags, layout offsets, cleanup and errno behavior. Use
actual target builds and hardware tests for hardware-dependent claims.
Report source and target checks, differential denominator, differences and
blocked evidence. Dynamic checks do not establish soundness by themselves.

Under end state A — a standalone Rust replacement, nothing linking
against the C++ side afterwards — there is no bridge, the seam is a
process or library boundary, and the rest of this file is
background. Under C the bridge is scaffolding deleted at cut-over,
and under B the C++-callable surface is the product. It must be
sound in all three, because unsoundness is not a scaffolding-grade
defect. The end-state decision is `/port-to-rust`.

## The `cxx` crate, the default bridge

Consider cxx when its supported types, existing build and public interface
fit. It generates and checks bridge declarations, not every lifetime,
thread-safety or semantic invariant. Do not introduce it without approval. A minimal bridge:

```rust,ignore
#[cxx::bridge(namespace = "engine")]
mod ffi {
    extern "Rust" {
        fn normalize(input: &str) -> String;
    }
    unsafe extern "C++" {
        include!("engine/legacy.h");
        fn legacy_normalize(input: &CxxString) -> UniquePtr<CxxString>;
    }
}
```

Use only supported bridge types and signatures for the pinned cxx version.
Opaque C++ types stay opaque; use the supported ownership wrappers, Pin
for required mutable access, and native constructors/destructors. Supported
Result-returning bindings translate exceptions under documented cxx rules;
do not assume arbitrary exception classes, templates or inheritance cross.
Verify the generated declarations and the actual native implementation.

## The C-ABI shim route

When `cxx` does not fit — an existing stable C API, or a build that
cannot take a new dependency — the fallback is `extern "C"` on both
sides with `#[repr(C)]` types and a hand-written shim. This is where
the `unsafe` lives: every block carries a `// SAFETY:` comment, and
review the whole shim under `/unsafe-rust` and `/rust-ffi`. Miri can check
supported Rust-only paths but cannot replace native C++ integration tests. For an existing C header, `bindgen` can generate
the declarations; it consumes the header, it does not own the safety
story.

## Build integration

Rust as a `staticlib` or `cdylib` linked into the existing CMake,
Bazel, or Make build; the `cc`/`cmake` crates when the Rust build
drives the C++ instead. The differential job builds both sides from
source rather than linking a stale artifact. Get the empty bridge
compiling and linked in CI before porting any logic — a
build-integration problem discovered after the port has started
blocks everything behind it.

## Errors across the boundary

Do not allow unwinding across an unsupported ABI. A Rust panic escaping a
non-unwinding ABI aborts; foreign unwinding into Rust across such an ABI
is undefined behavior. Translate expected C++ exceptions using supported
cxx Result bindings or a native catch boundary and explicit status contract.
Translate unwinding Rust panics only when required by the approved boundary;
catch_unwind cannot catch aborts and does not establish foreign exception
safety. Do not add C-unwind merely to bypass a boundary restriction.
Preserve noexcept, exception classification and output initialization.

## Data across the boundary

Document pointer ownership, allocator/deleter pairing, nullability, lengths,
alignment, valid ranges, lifetime, aliasing and thread access. Preserve
arbitrary byte strings; UTF-8 conversion needs an explicit contract.
repr(C) is not a portable representation of arbitrary C++ classes, STL
containers, vtables or bitfields. Use opaque handles and supported bridge
types. Verify target-specific layout and calling conventions for shared
C-compatible structs. Preserve callback user data, reentry, unregister and
shutdown order. Never infer Send or Sync solely from native reference
counting; prove the underlying object and destruction contract.

## Packaging and CI

Under B, the headers and the library ship as the deliverable —
`cbindgen`-generated headers if the surface is C-ABI, the `cxx`
generated headers otherwise. Under C, the bridge is deleted at
cut-over, and the deletion is a task in the plan. Under A, only the
Rust artifact ships.

## Native ABI and integration evidence

Inspect the source standard, compiler, target triple, C++ standard library,
CRT, exception/RTTI options, symbol visibility and static/dynamic link
policy. Do not assume binaries built with different C++ ABI settings are
compatible. Use approved generators and do not hand-edit generated headers.
Build and link fresh artifacts from both sides, exercise ownership transfers,
repeated callbacks, error paths, partial initialization and destruction order
on each required native target. Check supported sanitizer configurations and
report unavailable native execution. Miri is not a C++ ABI validator.

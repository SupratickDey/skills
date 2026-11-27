Under end state A there are no language bindings; use the existing process
or standalone boundary. A temporary language bridge is end state C. Under end state B
the C-callable surface is the product, and every exported signature is public
API; under C the seam is scaffold, built to be thrown away. The end-state
decision is `/port-to-rust`.

## `bindgen`, inward

`bindgen` generates Rust declarations from the existing C headers, so the
Rust side can call the C that has not moved yet. What it generates is raw:
`unsafe` functions, raw pointers, and `#[repr(C)]` types with no safety
discipline around them. The rule that follows: wrap the generated API in a
safe module immediately, and never let generated raw types spread through the
codebase. That wrapper is where the ownership and nullability decisions from
`MAPPING.md` get written down, once; the `unsafe` in it is `/unsafe-rust`.

## `cbindgen`, outward

`cbindgen` generates a C header from the Rust side, so existing C code can
call the ported module without editing call sites. Use the exact approved C signature and calling convention. Apply the
edition-appropriate export attribute (unsafe(no_mangle) in Rust 2024).
Pointer-taking exports that require caller safety guarantees must not
expose an unsound safe Rust API. Document the Safety contract and matching
header preconditions. Keep raw pointers at the ABI; use a validated safe
internal interface only when all reference invariants are established.

Define stable status codes, output initialization, null/length rules,
overlap, valid ranges, allocation and lifetime requirements. Reject
detectable invalid inputs without claiming to validate arbitrary addresses.
Preserve non-unwinding ABI behavior: a Rust panic escaping such an ABI
aborts, and a foreign unwind into Rust through it is undefined behavior.
Where the approved contract requires translation, catch unwinding Rust
panics at a suitable boundary; catch_unwind cannot catch aborts or make
invalid memory access safe. Do not let longjmp skip Rust frames.
Under B the public header and behavior are compatibility contracts;
route changes to /rust-api-design.

## Build integration

Rust lands in the build as a `staticlib` or `cdylib` linked into the existing
Make, CMake, or Autotools build; the `cc` crate covers the case where the
Rust build compiles the remaining C. The ordering rule that matters most in a
C port: get an empty exported function compiling, linking, and called from
the C test suite in CI before porting any logic. Build integration discovered
late blocks every module behind it.

## Errors across the boundary

Return codes go out; `errno`-style conventions are preserved where existing
callers depend on them; and no panic ever crosses. Under end state B the
code-to-meaning mapping is documented in the header rather than living in the
Rust enum only.

## Data crossing the boundary

Keep allocation and deallocation paired on the owning side. Verify size,
alignment, offsets, packing, native enum representation, flexible trailing
storage and target calling convention. repr(C) alone is insufficient for
bitfields or portable wire formats. Use pointer-plus-length for binary data
and CStr only for a proven readable NUL-terminated range. Preserve encoding
and embedded NUL behavior. Do not assume a pointer's numeric address proves
its provenance or validity.

## The transpile-then-refactor route, and its caveat

Automatic C-to-Rust transpilation produces compiling Rust that is entirely
`unsafe`, raw-pointer-based, and shaped exactly like the C. It is a
legitimate starting point only when treated as a checkpoint to refactor away
module by module, with the differential harness green throughout. It is not a
port, and stopping there produces a codebase with the drawbacks of both
languages — the transliteration anti-pattern in `/port-to-rust`, in its most
extreme form.

## Packaging and CI

Under B, the library and its generated header ship together, and the header
is version-controlled rather than generated-only, so a diff shows API changes.
Under A no language bridge is created. Under C delete the temporary bridge
and header at cut-over. In all three, the differential job builds both sides from
source.

## Callback lifecycle and native verification

Use ABI-correct callback trampolines with explicit user-data ownership.
Specify whether registration can call synchronously, callbacks can reenter
or run concurrently, and which thread may release context. Unregister and
wait for in-flight callbacks before freeing data; if the API cannot provide
that guarantee, choose an approved longer-lived ownership scheme. Do not
hold incompatible locks across foreign callbacks or declare Send/Sync
without evidence. Preserve signal and interrupt restrictions separately.

Pin the approved bindgen/cbindgen and native compiler configuration.
Generate declarations for the actual target, defines and include paths;
do not hand-edit generated output. Verify fresh native artifacts, exported
symbols, compiler ABI, layout and required integration tests using the
existing build system. Test allocator ownership, failure returns, callback
teardown and supported sanitizer paths. Miri is useful for supported Rust
paths but does not validate arbitrary native C execution. Firmware requires
actual supported hardware or clearly labeled simulation evidence.

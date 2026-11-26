Under end state A — the common case for Go — there is no binding layer
at all, and only the process-seam section below applies; the cgo
sections are for B and C. Under C, cgo carries the migration and is
deleted at cut-over. Under B the C ABI surface is the product and every
signature in it is public API. The end-state decision is
`/port-to-rust`.

## The process seam, which is the default

How to put a Rust binary behind an existing Go interface: one HTTP
route, one gRPC method, one subcommand, or one queue consumer at a
time, with both implementations reachable for approved isolated comparison.
Never mirror mutating live requests to both implementations without a
verified side-effect isolation contract. Why this is the right default for Go specifically: cgo is
expensive at the call and awkward in the build, while Go systems
almost always already have a network or process boundary to strangle
at.

## cgo, both directions, with its costs

Rust exposed as a C ABI `staticlib` or `cdylib` and called from Go
through cgo; Go exposed via `c-shared` and called from Rust. The costs,
stated honestly: a cgo call adds overhead that must be measured, the
Go runtime and the Rust side each want their own threads, Rust panics
and Go panics do not cross the boundary safely, and any pointer passed
across is subject to the cgo pointer-passing rules. A minimal surface:

A pointer-taking exported Rust function must not expose an unsound safe Rust
API. Use the edition-appropriate export attribute (unsafe(no_mangle) in
edition 2024) and document a Safety contract for any unsafe function.
Specify input/output lengths, valid allocation ranges, overlap, alignment,
ownership, error codes and initialization. Prefer caller-owned buffers or
paired allocation/free functions. A null pointer is not automatically a valid
zero-length Rust slice.



The `unsafe` in a shim is `/unsafe-rust`; whether the shim earns its
keep is a `/port-to-rust` strategy question.

## Errors across the boundary

A Rust `Result` becomes a status code plus an out-parameter across
cgo, or a typed error response across a network seam. Go callers
matching on sentinel errors must keep matching — map the sentinel set
explicitly rather than serializing a message.

## Data crossing the boundary

Use pointer-plus-length for arbitrary bytes, not implicit C strings. Verify
repr(C) layout and ABI on each target. Follow the pinned Go cgo pointer rules:
Go memory passed to C must satisfy pinning and pointer-content restrictions;
retention beyond the call requires supported explicit pinning for the full
lifetime. Strings and slices as descriptors are not retainable Go pointers.
Use runtime/cgo.Handle for opaque Go object references with explicit deletion,
not integer casts of Go pointers. Keep allocations and frees on their owning
side; verify callback and asynchronous lifetimes. Copy when borrowing cannot
be proven safe.

## Concurrency across the boundary

Use supported cgo exported callback entry points and verify thread attachment,
OS-thread affinity, reentry, runtime initialization and shutdown requirements.
Do not assume arbitrary callbacks or retained pointers are safe. Avoid holding
locks across callbacks. Keep the runtimes' task ownership explicit; stop and
join outstanding work before invalidating handles or unloading resources.
Translate expected errors at the ABI; do not let Rust unwinding or Go panics
cross unsupported foreign boundaries. Aborting panics cannot be recovered.

## Packaging and CI

Linking a Rust `staticlib` into a Go build, cross-compilation (which
Go makes easy and cgo makes hard — a cgo port loses `CGO_ENABLED=0`
static builds, and that is a deployment change to raise before phase
3), and the requirement that the differential job builds both sides
fresh.

Verify the actual GOOS/GOARCH, C toolchain, linker, ABI, dynamic library
requirements and deployment artifacts in clean environments. Run native
integration checks with the supported cgo pointer checks and race detector
where applicable. Record any loss of pure-Go build capability, and do not
publish or deploy without approval.

## What it does

Portable APIs, target-specific adapters and native verification. It applies to the approved project and its supported environments,
not to speculative changes or unrequested tooling.

## When to reach for it

Model-invoked: Design or implement Rust code that must work across operating systems, architectures or target environments. Use for cfg gates, filesystem and process differences, native libraries, target triples, cross-compilation and portability defects. Not for introducing support for unspecified platforms or general FFI soundness review. Users can invoke it directly by name.

## Decisions and verification

### Establish the supported target contract

Read the supported target triples, OS versions, architectures, deployment
artifacts, system dependencies and existing CI. Do not assume all Rust tier-one
targets are supported by this application. Separate host tools from target
code, native tests from cross-builds, and the minimum OS version from MSRV.

### Keep shared logic portable

Use std path, OS string and filesystem APIs instead of hardcoded separators
or assuming paths are valid UTF-8. Do not treat path normalization as proof
of confinement. Account for case sensitivity, symlinks, reserved names,
permissions, file locking, replacement semantics, filesystem durability and
line endings according to the actual OS/filesystem contract. Never promise
atomic replacement across filesystems. Preserve existing encoding contracts.

Use explicit byte order and fixed-width types for persistent or wire data.
Do not serialize usize or Rust memory layout as a portable protocol.
Avoid assumptions about pointer width, alignment, clocks or signal behavior.
Check platform-specific subprocess quoting and argument passing; prefer
Command with separate arguments rather than building shell strings.
Route untrusted paths and input to `/rust-security`. Read PATHS.md before
joining a path from configuration, an archive or a request onto a base
directory: it classifies path components instead of matching strings.

### Isolate platform-specific behavior

Keep cfg-gated adapters behind a narrow shared interface when the domain
contract is shared. Use target_os, target_arch, target_family or capability
features only when they accurately describe the condition. Distinguish
compile-time cfg from runtime feature detection. Provide explicit unsupported
behavior rather than a silent success or an insecure fallback. Use approved
native bindings and document ABI, ownership and library availability with
`/rust-ffi` and `/unsafe-rust`.

Inspect build scripts for host/target confusion: build.rs runs on the host;
Cargo target environment values describe the target. Check target-specific
dependencies and link configuration. Do not use target-cpu=native in a
portable distributed build without a verified hardware requirement.

### Verification

Run formatting and configured clippy/tests for applicable supported targets,
with -D warnings only if the project has no lint policy. Cross-check using
the installed target toolchain and approved linker or runner. Verify actual
native execution on each required OS for filesystem, process, timing,
permissions and native integration paths. A successful cross-build is not
native test evidence. Use isolated fixtures, including non-ASCII paths,
spaces, non-UTF-8 OS strings where applicable and platform-specific failure
cases. Report missing targets, linkers, operating systems and hardware
separately; do not claim portability solely from a Linux build.

## Common questions

**Does this skill authorize a new dependency or supported environment?** No.
Inspect existing choices and obtain approval for a material change.

**What if the required verification environment is unavailable?** Report
what was inspected or simulated, and distinguish the missing execution evidence.

## It's working if

- Supported platforms are named rather than assumed.
- OS-specific behavior is isolated without weakening shared contracts.
- Path and native dependency assumptions are verified.
- Cross-builds and actual target execution are reported separately.

## Where it fits

Use `/rust-ffi` for related concerns. See [rust-skills-map](../workflow/rust-skills-map.md)
for the full routing table.

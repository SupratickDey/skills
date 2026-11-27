---
name: port-from-go
description: Port Go into Rust — goroutines and channels onto tasks and async, interfaces onto traits, error values onto Result, and the value-semantics traps (zero values, integer wraparound, slice aliasing, nil). Use when porting, rewriting, or migrating Go, Golang, a Go service, or a Go CLI into Rust, when replacing a Go component with a Rust one behind the same interface, or when the user asks how a Go construct translates to Rust.
---

# Port from Go

## A construct mapping and a boundary, nothing else

This skill maps Go semantics and owns the Go boundary; process is
`/port-to-rust`. Go syntax maps almost mechanically and the runtime
model does not, so the easy-looking translation is where the port
goes wrong.

## The end state, and why Go usually lands on A

`/port-to-rust` names three end states; Go ports land on A — no
bindings — far more often than Python or JavaScript ports do,
because the cost of the alternative is cgo and a Go system almost
always already has a boundary to strangle at. A default, not a
rule: B is real when the deliverable is a Go-importable package;
C when a leaf function moves before its callers.

## The seam is usually a process, not a function call

cgo introduces boundary, toolchain and runtime costs that depend on the
actual workload and direction. Measure before choosing it. For most Go ports the right seam is one the system already
has — an HTTP route, a gRPC service, a subcommand, a queue consumer
— and the strangler strategy in `/port-to-rust` is the default, not
in-place FFI; mechanics and the cgo escape hatch are in
`BOUNDARY.md`.

## The traps that break parity silently

| Trap | What actually differs |
|---|---|
| Integer overflow | Go runtime integer arithmetic has defined overflow behavior at the operand width; constant overflow is a compile error. Rust overflow checks depend on the build policy. Any arithmetic that could overflow needs an explicit choice — `wrapping_add` to reproduce Go, or checked arithmetic plus a decision about what the new error path does |
| Zero values | Go variables have type-specific zero values. A zero value is not necessarily operationally usable (for example a nil map cannot accept writes). Rust has no implicit zero value, so each such site becomes either a `Default` impl (reproducing the behaviour) or a constructor that refuses (changing it). Reproducing is parity; refusing is an improvement, and improvements wait |
| `nil` is several things | A nil pointer, a nil slice (which appends fine and has length zero), a nil map (which reads fine and panics on write), and a nil interface holding a typed nil. `Option<T>` covers the first; the rest are behaviour, not absence, and mapping them all to `Option` produces subtle breakage |
| Slice aliasing | Go slices share a backing array, so a subslice mutation is visible through the original and `append` may or may not copy depending on capacity. Rust exclusive borrows prevent unsound simultaneous mutable aliasing — but if the source relied on the aliasing, the port must reproduce the *observable effect* deliberately, and if it relied on it accidentally, that is a bug found by the port and recorded |
| Error strings as contract | Go code branches on `err.Error()` text and on sentinel values via `errors.Is`. A port that redesigns the error taxonomy breaks callers that were matching on strings. Map the sentinel set first, then design — `/rust-errors` |

## Mapping, in one line

`MAPPING.md` holds the full table; a row is a starting point, not a
rewrite rule. The syntax maps easily and the runtime model does not
— the easy-looking rows are the ones to read twice.

## Interfaces are implicit; traits are not

A Go interface is satisfied by shape, so the port finds the
implementers and writes `impl Trait for Type` for each: prefer a concrete type when no abstraction is needed. Preserve real substitution,
object identity and method-set contracts; choose generics or dyn based on actual
usage rather than implementer count alone.

## The test suite is the corpus

Go table-driven tests port almost directly and are characterization
input; benchmarks are not parity evidence. Go suites are thin on
concurrent interleaving, where the port changes behaviour — a race
the GC and scheduler hid is still a race. Harness shapes are
`/rust-testing`.

## Goroutines, channels and scheduling

A go statement evaluates the function and arguments in the caller before
starting concurrent execution. Preserve observable initiation and ownership;
a Rust async function is lazy until polled. Select the existing async runtime,
thread or blocking pool according to the operation. Do not assume dropping a
JoinHandle cancels work or that waiting on a Go WaitGroup propagates failures.

Go channels have a fixed capacity; capacity zero means a rendezvous. A Tokio
mpsc channel with capacity one is not an unbuffered Go channel. Choose an
existing compatible rendezvous mechanism or explicit acknowledgment protocol
when synchronization is observable. Preserve sender/receiver topology, FIFO
requirements, nil-channel blocking, close ownership, draining buffered values,
and closed receive's zero value plus false status. Go sends to closed channels
panic; Rust channel send errors have different contracts. Do not emulate
unbounded queues to avoid modeling backpressure.

Go select evaluates channel operands and send expressions on entry and chooses
among ready communications pseudo-randomly; default is nonblocking. A nil
channel cannot become ready. Tokio select has different polling, cancellation
and branch evaluation semantics. Preserve side effects, default behavior,
and starvation requirements explicitly; test permitted outcomes, not an
invented deterministic schedule. See `/async-rust` and `/rust-concurrency`.

## Context, deadlines and cancellation

Preserve parent-child cancellation, inherited earliest deadlines, cancellation
causes, and any values used by the actual operation. A per-call timeout that
restarts a full budget at every layer is not equivalent. Map cancellation
and deadline exceeded separately where callers distinguish them. Context
cancellation is a signal, not proof remote work stopped. Preserve cleanup
and task joining; handle blocking operations and ambiguous mutation completion
using `/rust-resilience`. Keep authenticated context separate from arbitrary
request values. Do not introduce a new runtime just to obtain a token type.

## Value and error parity

Inspect integer width (including target-dependent int and uint), wrapping,
shift counts, zero divisors and signed MIN / -1. Go signed integer division
truncates toward zero; MIN / -1 yields MIN and remainder zero at the operand
width. Use explicit wrapping operations for that contract and check zero
before division. Rust checked division rejects MIN / -1 and therefore needs
a deliberate adapter for Go parity.

```rust
fn go_divmod_i64(a: i64, b: i64) -> Option<(i64, i64)> {
    if b == 0 {
        return None;
    }
    Some((a.wrapping_div(b), a.wrapping_rem(b)))
}
```

The helper represents a bounded Go int64 operation; the caller must preserve
the actual zero-divisor panic or recovery behavior at the approved boundary.
Preserve typed-nil interface states where observable, nil versus empty JSON
values, byte strings and invalid UTF-8 iteration. Go errors.Is and errors.As
can traverse wrapping trees and use custom matching methods; Rust Error::source
alone does not establish equivalent behavior. Keep sentinel identity,
classification and wrapped context that callers observe.

## Verification

Both sides:

```bash
cargo test
cargo clippy --all-targets   # add -- -D warnings only if the target repo has no lint config
go test ./...                                # the source still passes while both implementations run
go vet ./...
```

Then the differential run with its denominator, and the Go-specific
corpus requirement: at least one case per trap — arithmetic at the
wraparound boundary, a zero-valued struct, a nil map or nil slice,
a subslice that was mutated, and a caller that matched on an error
sentinel. Add the concurrency check: run the Rust side under load
with more than one worker, because a single-threaded differential
run proves nothing about the part of the port that changed most.

Select the supported feature/target matrix. Run go test -race where the Go
platform and toolchain support it; report unsupported checks. Exercise
rendezvous, close/drain, nil channels, cancellation races, inherited deadlines
and error classification. Compare allowed concurrent outcomes and persistent
side effects, not scheduler-dependent exact interleavings.

## What it does

Maps Python constructs to Rust and carries the mechanics of the seam — a
process boundary when the Rust replaces the Python outright, and PyO3 when
Python keeps calling the code. The
defining constraint: construct mapping and boundary mechanics for one
source language, with every process question deferred — the parity
contract, the phases, and the anti-patterns are `/port-to-rust`.

## When to reach for it

Model-invoked: the agent pulls this in when Python code is moving into
Rust — a Python CLI, a Django, Flask, or FastAPI service, a NumPy-heavy
module, a Python tool becoming a Rust binary, or a hot Python function
being replaced by a native extension — and the question is what a Python
construct becomes, or how the seam works. It does not cover how a port is run (that is
`/port-to-rust`), the differential harness (`/rust-testing`), or the shape
of the Rust that comes out (`/idiomatic-rust` and the other craft skills). The
user can run it directly, as `/port-from-python`.

## Prerequisites

A runnable Python implementation and its test suite, a Cargo project, and
a decided end state — `/port-to-rust` is run first, because whether a PyO3
layer exists at all is settled there.

## The traps

| Trap | What actually differs |
|---|---|
| Integer width | Python `int` is arbitrary precision. Fixed-width integers require explicit range and overflow semantics; Rust overflow behavior depends on the build policy. Decide per field: `i64`/`i128` with a documented range, `u64` where the domain is non-negative, or `num-bigint` where the source genuinely relies on unbounded size |
| Floor division and modulo | Python `//` floors toward negative infinity and `%` takes the sign of the divisor; Rust `/` truncates toward zero and `%` takes the sign of the dividend. `-7 // 2` is `-4` in Python and `-7 / 2` is `-3` in Rust. For signed integers, use checked truncating division and remainder, then adjust quotient and remainder when the nonzero remainder and divisor have opposite signs. Euclidean remainder is nonnegative, so it is not equivalent for negative divisors. |
| `str` versus `bytes` | Python `str` indexes and slices by code point; Rust strings are UTF-8, do not support integer indexing, and byte-range slicing requires valid character boundaries. Python can also contain lone surrogates that Rust str cannot represent. `bytes` is `Vec<u8>`/`&[u8]`. Every `s[i]` in the source is a decision, not a translation — most become `.chars().nth(i)` only if the source really meant code points |
| Truthiness | `if x:` is false for `0`, `""`, `[]`, `{}`, `None`, and objects whose `__bool__` returns false or whose fallback `__len__` returns zero. Rust has no such coercion, so each site becomes an explicit predicate — and getting one wrong changes a branch nobody tests |
| Exceptions crossing layers | A Python exception propagates through every frame that did not catch it, including frames that were never written with failure in mind. Rust makes every propagation point visible with `?`, which surfaces error paths the source never had a name for. What the error type should be is `/rust-errors` |

## Bindings, or no bindings

The end state decides whether PyO3 appears at all:

| End state | In Python terms | PyO3 |
|---|---|---|
| A. Replacement | A Rust binary or crate replaces the Python entirely; the seam is the CLI, the HTTP route, or the queue consumer that already exists | Never appears |
| B. Rust core, Python package is the product | The importable package keeps its name and its signatures; the engine underneath becomes Rust | Permanent public surface — signatures, exception types, wheels per platform, semver |
| C. Scaffold | The port ends standalone, but Python calls the Rust module while the migration is under way | Temporary, and deleted at cut-over |

Under B and C the route is PyO3 plus maturin: a Rust extension module
that the existing Python imports through the existing compatible public package interface, built with `maturin develop` into the active virtualenv. Under B
the binding surface is a permanent public API — signatures, exception
types, wheels per platform, semver; under C it is scaffold, deleted at
cut-over. Under A there is no binding layer at any point and the seam is
the process boundary the system already has — a CLI invocation, an HTTP
route, a queue consumer — with the differential harness running
process-to-process. The mechanics are in `BOUNDARY.md`.

## Common questions

**Does a Python port have to produce a PyO3 module?** No. That is end
state B or C, the cases where Python keeps importing the code after the
port. A standalone Rust CLI is end state A and never imports into Python;
its seam is the process boundary.

**How do you tell scaffold bindings from a product package?** Whether the
binding surface outlives the port. Scaffold (C) is temporary but must still be safe and preserve required
behavior until cut-over; product (B) is a public API with semver,
exception-type mapping, and wheels per platform.

**Port the whole app, or one module?** One module at a time, and the one
to move first is the one a profiler names — `cProfile` or `py-spy` over
the running app. The usual shape is a small fraction of the code taking
most of the time; under B and C the PyO3 seam makes that path real, and
under A the boundary is whatever process seam the system already has.

**What about `pickle`?** Serde does not decode pickle. Preserve the trusted Python adapter or use an
approved stored-format migration. Never deserialize untrusted pickle.

**Is `pytest` coverage enough evidence?** No. The suite is
characterization input — the cases are inputs, the assertions are recorded
behaviour — and a Python suite is thinnest exactly where a port narrows
behaviour: the error paths and the edge cases. The evidence is the
differential run, reported with its denominator.

**What happens to arbitrary-precision integers?** A per-field decision:
`i64` or `i128` with a documented range, `u64` where the domain is
non-negative, `num-bigint` where the source genuinely relies on unbounded
size. An i64 cannot represent Python integers outside its range. Preserve checked
range and overflow behavior, including intermediate results.

## Interpreter and distribution compatibility

Use the project's pinned PyO3 API generation. Detach independent Rust work
without accessing Python-bound objects; review concurrency explicitly for
free-threaded interpreters. Lists usually require conversion, while buffers
and arrays need layout, lifetime and mutability checks before borrowing.
Build and install fresh wheels on required platforms and distinguish local
development imports from distribution evidence. Measure end-to-end host
performance rather than assuming native code is faster.

## It's working if

- The end state was chosen before any Rust was written, and no PyO3 layer
  exists under end state A.
- Under B and C, the existing Python suite still passes with the Rust
  module installed.
- The differential corpus includes at least one case per trap in the table
  above.
- No `dict`-as-record survived as a `HashMap`.
- Integer ranges were decided per field and written down.
- The error types raised across the boundary match what the existing
  `except` blocks catch.

## Where it fits

`port-from-python` is the Python member of the per-language porting
skills: it owns the construct mapping and the PyO3 boundary, and defers
everything common to a port to `/port-to-rust`, the harness mechanism to
`/rust-testing`, and the target-side judgment to the craft skills
(`/rust-errors`, `/type-driven-design`, `/ownership-not-clone`,
`/async-rust`, `/idiomatic-rust`). Its neighbours are the other
per-language skills — C, C++, TypeScript, Go, and Java —
which share its three-file shape but carry different traps and a
different boundary. See `rust-skills-map` for how the full set relates.

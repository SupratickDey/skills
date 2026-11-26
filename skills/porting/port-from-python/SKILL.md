---
name: port-from-python
description: Port Python into Rust — construct mapping, the semantic traps (integer width, floor division, str versus bytes, exceptions to Result), and the seam, which is a process boundary for a standalone replacement and PyO3 when Python keeps calling the code. Use when porting, rewriting, or migrating Python, CPython, Django, Flask, FastAPI, NumPy, or a Python CLI into Rust, when replacing a Python tool with a Rust binary or a hot Python module with a native extension, or when the user asks how a Python construct translates to Rust.
---

# Port from Python

## A construct mapping and a boundary, nothing else

This skill maps Python to Rust and owns the PyO3 boundary. The parity
contract, the five phases, and the anti-patterns are `/port-to-rust`, which
runs first and stays running through the port.

## The end state decides whether PyO3 appears at all

`/port-to-rust` names three end states, and this is where the choice bites
hardest, because Python has the cheapest FFI story and the easiest to reach
for uninvited. This skill asks rather than assumes.

| End state | In Python terms | PyO3 |
|---|---|---|
| A. Replacement | A Rust binary or crate replaces the Python entirely; the seam is the CLI, the HTTP route, or the queue consumer that already exists | Never appears |
| B. Rust core, Python package is the product | The importable package keeps its name and its signatures; the engine underneath becomes Rust | Permanent public surface — signatures, exception types, wheels per platform, semver |
| C. Scaffold | The port ends standalone, but Python calls the Rust module while the migration is under way | Temporary, and deleted at cut-over |

## When there are bindings, the Python seam is unusually good

Under B or C, a Rust extension module built with PyO3 and packaged with
maturin is importable from the existing Python with a compatible public adapter where needed, which makes "port the hot leaf module first, keep the
app in Python" a genuinely incremental path rather than a euphemism. Under
A none of that applies and the seam is a process boundary — the strangler
strategy in `/port-to-rust`; mechanics for both are in `BOUNDARY.md`.

## The traps that break parity silently

The body carries these five because each one produces a port that passes a
naive test suite and is wrong; the full table is `MAPPING.md`.

| Trap | What actually differs |
|---|---|
| Integer width | Python `int` is arbitrary precision. Fixed-width integers require explicit range and overflow semantics; Rust overflow behavior depends on the build policy. Decide per field: `i64`/`i128` with a documented range, `u64` where the domain is non-negative, or `num-bigint` where the source genuinely relies on unbounded size |
| Floor division and modulo | Python `//` floors toward negative infinity and `%` takes the sign of the divisor; Rust `/` truncates toward zero and `%` takes the sign of the dividend. `-7 // 2` is `-4` in Python and `-7 / 2` is `-3` in Rust. For signed integers, use checked truncating division and remainder, then adjust quotient and remainder when the nonzero remainder and divisor have opposite signs. Euclidean remainder is nonnegative, so it is not equivalent for negative divisors. |
| `str` versus `bytes` | Python `str` indexes and slices by code point; Rust strings are UTF-8, do not support integer indexing, and byte-range slicing requires valid character boundaries. Python can also contain lone surrogates that Rust str cannot represent. `bytes` is `Vec<u8>`/`&[u8]`. Every `s[i]` in the source is a decision, not a translation — most become `.chars().nth(i)` only if the source really meant code points |
| Truthiness | `if x:` is false for `0`, `""`, `[]`, `{}`, `None`, and objects whose `__bool__` returns false or whose fallback `__len__` returns zero. Rust has no such coercion, so each site becomes an explicit predicate — and getting one wrong changes a branch nobody tests |
| Exceptions crossing layers | A Python exception propagates through every frame that did not catch it, including frames that were never written with failure in mind. Rust makes every propagation point visible with `?`, which surfaces error paths the source never had a name for. What the error type should be is `/rust-errors` |

## Integer and Unicode parity

For a bounded i64 contract, use the checked division and remainder operations.
When the remainder is nonzero and its sign differs from the divisor, subtract
one from the quotient and add the divisor to the remainder. Map zero divisors
and out-of-range results to the approved error contract; Python itself can
represent i64::MIN divided by -1. For unbounded Python integers, retain the
required range rather than silently rejecting or truncating values. Floating
floor division has separate rounding and special-value semantics.

```rust
fn python_divmod(a: i64, b: i64) -> Option<(i64, i64)> {
    let q = a.checked_div(b)?;
    let r = a.checked_rem(b)?;
    if r != 0 && (r < 0) != (b < 0) {
        Some((q.checked_sub(1)?, r.checked_add(b)?))
    } else {
        Some((q, r))
    }
}
```

This example is a bounded integer helper, not a replacement for Python's
arbitrary-precision or floating-point divmod. Check all four sign combinations,
zero, exact divisibility and the minimum signed integer boundary.

Normalize Python negative indices and slice bounds against the original
sequence length, including step direction and zero-step errors. Python code
points are not grapheme clusters. Preserve the source's Unicode normalization
and case behavior, encoding error policy and surrogate contract where relevant.

## Mapping, in one line

`MAPPING.md` holds the full table; a mapping row is a starting point, not a
rewrite rule. `dict` becomes a `HashMap` when the key set is dynamic and a
`struct` when the source was using a dict as a record with fixed keys —
which most Python code is. The single highest-value change in a Python
port is turning stringly-keyed dicts into structs and enums, and the
decision belongs to `/type-driven-design`.

## Duck typing is not a trait

A function that accepts "anything with `.read()`" maps to a trait bound
only when there are several implementations; with one caller and one type,
it maps to that type. Porting every duck-typed parameter into a trait
reproduces an abstraction the source never had — the "porting the
abstraction" anti-pattern in `/port-to-rust`.

## The test suite is the corpus

An existing `pytest` suite is characterization material: the cases are
inputs, the assertions are the recorded behaviour. It is not the parity
contract and it is not complete — the error paths and the edge cases are
where a Python suite is thinnest and where a port narrows behaviour. Harness
shapes are `/rust-testing`; what has to be covered is `/port-to-rust`.

## Async, if the source has it

`asyncio` maps to `tokio`, but the trap is different: Python coroutine execution on one event loop does not prevent races across
await points or threads. Rust task placement adds Send/Sync requirements
where applicable; preserve cancellation, task ownership and synchronization. Blocking work hidden inside
an `async def` is the same defect in both languages — `/async-rust`.

## Verification

Both sides:

```bash
cargo test
cargo clippy --all-targets   # add -- -D warnings only if no lint policy exists
python -m pytest
```

Select supported features and targets. Run the original Python suite against
the source baseline; for B and C rebuild the extension in an isolated approved
virtual environment, verify the loaded module path and run the compatible host
suite against it. Under A nothing imports the Rust module from Python, and the
differential harness runs process-to-process — the
same argv and stdin through both implementations, with stdout, stderr, and
exit codes compared.

Then the differential run over the recorded corpus, reported with its
denominator, plus the Python-specific check: inputs that cross the trap
boundaries above — a negative numerator with `//`, an integer past 2⁶³,
a non-ASCII string sliced mid-character, an empty container in a
truthiness branch. A corpus that never crosses those has not tested the
port, it has tested the happy path.

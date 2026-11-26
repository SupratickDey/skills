Under end state A — a standalone Rust replacement, no Python importing
anything afterwards — the rest of this file does not apply, and the seam is
the process boundary described in the second-to-last section. Read `/port-to-rust`
for the end-state decision and come back only under B or C.

Under C the binding layer is temporary, but its safety and required parity
remain mandatory until removal; under B it is the product surface, and every choice
below is a public API decision that outlives the port.

## PyO3 plus maturin, the route under B and C

The extension module is a `cdylib` that PyO3 exposes to the interpreter.
For an authorized new module, maturin can scaffold the crate and pyproject.
Inspect existing package layout and pinned versions first; the following is
an illustrative PyO3 0.23 API shape, not a dependency upgrade recommendation.

```rust,ignore
use pyo3::prelude::*;

#[pyfunction]
fn normalize(input: &str) -> PyResult<String> {
    Ok(input.trim().to_lowercase())
}

#[pymodule]
fn fastcore(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(normalize, m)?)?;
    Ok(())
}
```

with the build fragments beside it — `Cargo.toml` declares the crate type,
`pyproject.toml` declares maturin as the build backend:

```toml
[lib]
name = "fastcore"
crate-type = ["cdylib"]

[dependencies]
pyo3 = { version = "0.23", features = ["extension-module"] }
```

```toml
[build-system]
requires = ["maturin>=1.5,<2.0"]
build-backend = "maturin"

[project]
name = "fastcore"
version = "0.1.0"
```

`maturin develop` builds the extension and installs it into the active
virtualenv under the module name, but import resolution and package compatibility must be tested. Preserve
public names, signatures, defaults, keyword-only arguments, exception types,
class behavior and existing Python adapters.

Classes cross the same way, because under B the package keeps its class
signatures: a `#[pyclass]` with a `#[pymethods]` block, where `__init__`
becomes `#[new]`, registered with `m.add_class::<Counter>()?` in the
module function:

```rust,ignore
#[pyclass]
struct Counter {
    value: i64,
}

#[pymethods]
impl Counter {
    #[new]
    fn new(start: i64) -> Self {
        Counter { value: start }
    }

    fn increment(&mut self) {
        self.value += 1;
    }
}
```

## Errors across the boundary

A Rust `Err` becomes a Python exception, and which exception is a parity
decision: the existing callers catch specific types, so a port that raises
a generic exception breaks `except ValueError:` blocks that the corpus
never covers. Map the error enum to exception types explicitly — the
`pyo3::exceptions` types, `PyValueError`, `PyIOError`, `PyTypeError` —
rather than accepting the default. PyO3 can translate unwinding panics to PanicException at supported boundaries.
That is not ordinary application error handling; aborting panics cannot be
caught, and foreign boundaries have their own unwind contracts. Avoid panics
for expected failures and verify the pinned PyO3 behavior.

## Interpreter attachment and concurrent access

Inspect the installed PyO3 and Python versions. Older PyO3 uses with_gil
and allow_threads; newer versions use attach and detach. Do not combine
API generations or change the dependency simply to use a newer name.
Detach around independent Rust work or blocking waits when appropriate.
Do not access Python-bound objects or call Python callbacks while detached;
copy or transfer owned data under an explicit lifetime contract first.

Free-threaded CPython changes synchronization assumptions. The Python token
represents thread attachment, not an exclusive lock in that build.
Review shared state, concurrent class borrows, locks, callback reentry and
deadlock risks. Do not advertise free-threaded support or set module GIL
policy until the pinned version's requirements and actual concurrent tests
support it. Some versions have different defaults for module GIL policy.
Retain Python-side task cancellation and error behavior for async adapters.

## Data crossing the boundary

Do not assume extraction is zero-copy. Python lists contain Python objects
and normally require element conversion to a Rust collection. Bytes, buffers
and NumPy arrays can sometimes be borrowed with an appropriate API, but
verify contiguity, strides, dtype, byte order, alignment, mutability,
ownership and lifetime. Noncontiguous or incompatible inputs may need a
copy or a documented rejection. Keep the owner alive for any borrow;
do not retain a raw pointer after its valid lifetime or let concurrent
mutation invalidate Rust references.

Batch work across the seam when the measured workload justifies it.
Measure the Python-visible end-to-end operation including conversion,
allocation, interpreter attachment, scheduling and copies. Preserve a tested
fallback or rollback only under the approved selective acceleration policy.

## The no-bindings route, for end state A

The seam is a process boundary the system already has: a CLI invocation, an
HTTP route, a queue consumer, or a cron entry point. The Rust binary takes
one of them at a time while Python keeps the rest, and the differential
harness runs process-to-process — same argv and stdin through both, outputs
and exit codes compared — rather than in-process. What this costs relative
to bindings: no shared memory, so the comparison is over serialized output,
and the granularity is whatever the existing boundary is, which may be
coarser than a function. What it buys: no PyO3 in the tree, no wheels to
build, no GIL to reason about, and a port that ends with one language
rather than two.

## Packaging and CI

Under B preserve the approved distribution matrix: Python versions, OS,
architecture, interpreter variants and native dependencies. abi3 can cover
multiple compatible Python versions on a given platform, subject to the
limited API and pinned PyO3 support; it is not a universal wheel or automatic
free-threaded compatibility. Use the existing maturin build policy, verify
wheel tags and native library constraints, install each required wheel into
a clean environment, confirm module provenance and run host tests there.
A local maturin develop import is not wheel-distribution evidence. Under C
build and verify the fresh scaffold on required environments. Under A verify
the standalone artifact instead. Report unsupported or untested combinations;
never publish without authorization.

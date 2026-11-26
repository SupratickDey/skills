---
name: rust-debugging
description: Diagnose and fix an existing Rust defect with a reproducible failing case, evidence-led root cause, minimal coherent change, and regression verification. Use for bugs, unexpected behavior, failing tests, regressions, crashes or compiler errors in existing code. Not for general feature design, standalone code review, or optimization without a correctness defect.
---

# Rust Debugging

Fix the demonstrated cause within the authorized scope. A small diff is a
preference, not a reason to leave the cause unresolved. Preserve observable
behavior outside the defect and avoid replacing a working implementation.

## Establish the contract and baseline

Inspect the working tree, relevant specification, existing implementation,
callers, tests, toolchain, MSRV and configuration. State expected versus actual
behavior, input conditions and observable impact. Preserve existing user
changes. Reproduce with the narrowest safe command or fixture; capture actual
diagnostics and note whether the failure is deterministic. Never execute
production mutations merely to reproduce a bug.

If prerequisites block reproduction, trace the relevant path statically and
label the result unverified. Do not invent logs or claim a reproduced failure.

## Isolate the cause

Form a small set of hypotheses; identify the evidence that would falsify each.
Trace input, control flow, state transitions and ownership at the failing
boundary. Compare with a known-good version or representative successful case
when available. Change one diagnostic variable at a time.

| Signal | Follow-up |
|---|---|
| Compiler or borrow error | Read the first relevant diagnostic and inspect ownership, lifetime or trait requirements |
| Wrong result or panic | Trace the exact input, validation, indexing, arithmetic and state transition |
| Async stall or race | Inspect cancellation, blocking, lock order, admission limits and task lifecycle |
| Performance regression | Measure the changed workload with rust-performance |
| Migration discrepancy | Compare the source contract and independent differential fixtures |

Use targeted instrumentation with redacted values. Prefer existing debugging
tools and logs over introducing diagnostic dependencies or permanent tracing.
Do not treat the last stack frame, compiler suggestion or recent edit as proof
of the root cause.

## Implement the focused correction

Add a regression test that fails for the demonstrated reason against the old
behavior when practical. Correct the causal boundary and all directly affected
paths. Preserve existing method signatures, variable names, public contracts,
dependencies and structure unless a broader change is necessary and authorized.
Do not rename unrelated files, reformat unrelated code or introduce a framework
to resolve a local bug.

Do not suppress errors, disable tests, weaken validation, bypass authorization,
insert arbitrary retries or sleeps, or clone data only to appease a diagnostic.
If a genuine contract or architecture change is required, identify the affected
decision and obtain approval before changing it. Remove temporary diagnostics
unless they have enduring operational value and are in scope.

## Verification

Run the original reproduction and the regression test after the fix. Confirm
the test would detect the defect, and run applicable neighboring tests and
repository-wide checks. Use the actual configured Cargo workspace, supported
feature combinations, lint settings and MSRV; for a simple crate:

```bash
cargo fmt --check
cargo clippy --all-targets
cargo test
```

Use -D warnings only where no lint configuration exists. Review git diff and
git status without reverting other changes. Report the root cause, correction,
actual commands and outcomes, limitations and any residual risk. Separate
static reasoning from executed evidence; a blocked check cannot be reported
as passed.

Route test design to rust-testing, ownership to ownership-not-clone, errors
to rust-errors, async to async-rust and threads to rust-concurrency. A review
request without authorization to edit belongs to rust-code-review.

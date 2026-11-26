---
name: rust-refactoring
description: Plan or perform an authorized behavior-preserving structural change in Rust. Use for extracting cohesive functions or modules, removing duplication, simplifying existing code, narrowing dependencies and improving maintainability. Not for fixing a known behavioral defect, changing contracts, performance tuning or redesigning the architecture.
---

# Rust Refactoring

Refactoring changes structure while preserving the agreed observable behavior. Keep it separate from a bug fix, feature, optimization or breaking API change so the reviewer can reason about each change independently.

## Define the behavior to preserve

Inspect the specification, existing callers, public interfaces, tests and
working tree. Identify return values, error variants and messages where
contractual, ordering, state changes, I/O, serialization, authorization,
audit events, resource lifetimes and concurrency guarantees. Establish the
baseline on the supported workspace and feature matrix. Preserve existing
user edits and document known failing checks rather than treating them as a
successful baseline.

Add focused characterization tests when coverage is insufficient. Derive
expectations from the current contract and independent observations, not from
the new implementation. A defect discovered while refactoring is a separate
decision; report it and route a requested fix to `/rust-debugging`.

## Select a small coherent transformation

| Symptom | First candidate |
|---|---|
| Repeated implementation of the same invariant | Extract one private helper |
| Service combines independently changing responsibilities | Extract a focused collaborator without changing external entry points |
| Deep control flow obscures an invariant | Introduce clear guard clauses while preserving evaluation order |
| Widely exposed internals | Reduce visibility only after checking all supported callers |
| File has grown large | Split by responsibility, not line count |

Use DRY for shared knowledge, not accidental textual similarity. Do not
generalize unrelated code to eliminate a few repeated lines. Preserve public
signatures and existing dependencies by default. Do not introduce a pattern,
trait, clone, cache, runtime, global state or synchronization primitive merely
for appearance. Route a proposed public API change to `/rust-api-design` and a
material architecture change to `/rust-architecture`.

Apply one mechanically understandable change at a time. Run focused checks
between steps. Preserve evaluation and side-effect order, short-circuiting,
drop timing, error mapping, panic behavior where contractual, allocation or
latency constraints where required, and wire compatibility. In Rust, moving
a value or changing an iterator can alter ownership, destructor timing and
error behavior; do not assume that compiling proves equivalence.

Do not edit applied migrations or generated code manually. Follow the existing
generator and compatibility policy. Do not combine formatting churn, unrelated
renames, dependency upgrades or a feature implementation with a refactor.
If the requested structural change cannot preserve the contract, stop and
identify the decision needed.

## Verification

Run focused tests against the original and revised behavior when practical.
Run configured format checks, clippy and relevant unit and integration tests
on supported workspace members, features, targets and MSRV. Add -D warnings
only when the repository has no lint configuration. For public APIs use the
existing compatibility checks and report their limits. Review git diff and
git status to confirm unrelated files and tests are untouched. Do not weaken
tests or change expectations to accommodate the new structure. Record the
behavior contract, transformations, actual commands, outcomes and any
unverified equivalence. If only a plan was requested, do not modify files.

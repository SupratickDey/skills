## What it does

Refactoring changes structure while preserving the agreed observable behavior. Keep it separate from a bug fix, feature, optimization or breaking API change so the reviewer can reason about each change independently.

## When to reach for it

Model-invoked. Plan or perform an authorized behavior-preserving structural change in Rust. Use for extracting cohesive functions or modules, removing duplication, simplifying existing code, narrowing dependencies and improving maintainability. Not for fixing a known behavioral defect, changing contracts, performance tuning or redesigning the architecture. Users can also invoke it directly by name.
The skill supplies guidance for the authorized task, not permission to edit.

## Refactoring decisions

Identify the observable contract and establish a baseline before restructuring.
Use small, reviewable transformations, preserve public interfaces and existing
tests, and separate new behavior into a different authorized change.
Check Rust-specific effects such as evaluation order, ownership, resource
lifetimes and error mapping.

## Common questions

**Is a bug fix a refactor?** No. Correcting behavior needs a separate, explicit defect decision.

**Does passing compilation prove equivalent behavior?** No. Use characterization and integration checks for the relevant contract.

## It's working if

- The diff changes structure without intentionally changing behavior.
- Existing public signatures, dependencies and unrelated edits remain intact.
- Characterization and integration evidence covers affected paths.
- Discovered defects and blocked checks are reported separately.

## Where it fits

Works alongside rust-debugging, rust-architecture, rust-api-design and rust-testing. See rust-skills-map for the full routing table.

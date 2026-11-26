---
name: rust-architecture
description: Design or review module, crate and component boundaries in a Rust application. Use for structural design, dependency direction, service decomposition, responsibility separation and choosing justified abstractions. Not for public API compatibility, routine refactoring, defect diagnosis or deployment configuration.
---

# Rust Architecture

Choose the simplest structure that satisfies current requirements and makes the important invariants enforceable. Do not replace a working architecture because a named pattern looks cleaner.

## Establish the constraints

Read the specification, ADRs, dependency graph, deployment topology, existing
modules and key execution paths. Identify the responsibilities that change
independently, ownership of data, authorization decisions, failure boundaries
and external dependencies. Record the actual requirements for scale, latency,
availability, portability and team ownership. Do not invent them.

## Choose a boundary with a reason

| Need | Smallest useful choice |
|---|---|
| Hide implementation details | Private module, narrow pub(crate) interface |
| Share a cohesive capability between crates | Library crate with deliberate public API |
| Isolate an external system | Adapter at the dependency boundary |
| Select real interchangeable behavior | Enum, concrete wrapper, generic or dyn Trait as appropriate |
| Independent deployment or failure isolation | Separate process only with an explicit operational requirement |

Prefer a modular application to premature service decomposition. A crate
boundary has compile-time and API costs; a process boundary adds network,
serialization, operational, security and failure modes. Explain why the
boundary is worth its cost. Follow the existing deployment and technology
decisions. Do not add infrastructure, messaging or a second runtime just to
implement a pattern.

## Responsibility and dependency direction

Group code around cohesive capabilities and reasons to change, not a target
file count. Let use-case orchestration coordinate domain rules, access checks,
persistence, event handling and external calls without implementing all of
them itself. Keep domain invariants close to the data they protect. Enforce
access at the trusted boundary and service operation, not only in presentation.

Apply SOLID as design questions rather than class-oriented rules. Keep
responsibilities cohesive; extend at demonstrated variation points; ensure
implementations satisfy the same behavioral contract; expose narrow interfaces;
and inject external collaborators at a composition boundary. Start with
concrete types. Introduce a trait when actual alternative implementations,
an existing test seam or a required dependency boundary justifies it. Do not
create a trait for every struct or a generic repository for every entity.
Use the established testing approach.

Avoid dependency cycles, globally mutable service locators and broad
all-purpose services that expose private helpers. Make transaction ownership,
error propagation, resource cleanup and side effects explicit. Separate
platform-specific adapters from shared policy when relevant. Review large
files for cohesion; split by responsibility only when it improves the task.

## Record the design

For a nontrivial change, name the candidate boundaries, dependency direction,
alternatives, chosen trade-offs, failure behavior, compatibility impact and
verification plan. Obtain approval for material architecture changes and
hard-to-reverse decisions; do not write an ADR without authorization.
When the request is design-only, return the design without changing code.
Route API visibility and trait details to `/rust-api-design`, domain invariants
to `/type-driven-design`, security to `/rust-security`, and authorized
behavior-preserving restructuring to `/rust-refactoring`.

## Verification

For design-only work, inspect relevant modules and existing Cargo metadata
where available, trace the proposed dependency and data flows, and state
which claims need implementation evidence. For authorized changes, inspect
the diff and run the project's configured format check, clippy and relevant
unit and integration tests with supported workspace members, features, targets
and MSRV. Check dependency direction using cargo metadata or cargo tree when
crate boundaries change. Add -D warnings only if no lint policy exists.
Verify contracts and failure paths across the affected boundaries, and report
checks that could not run. Do not treat successful compilation as architecture
or security approval.

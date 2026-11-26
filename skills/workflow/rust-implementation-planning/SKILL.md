---
name: rust-implementation-planning
description: Plan a nontrivial Rust feature, migration increment or multi-file implementation from the project's specification. Use for implementation plans, delivery sequencing, acceptance criteria, dependencies and unresolved requirements. Not for routine single-file fixes, standalone system architecture, independent review or authorizing changes merely by writing a plan.
---

# Rust Implementation Planning

A plan translates authorized requirements into a bounded sequence of verifiable changes. It does not create new requirements, approve a risky decision or authorize implementation when the user requested planning only.

## Read the source of truth

Inspect the current repository state, applicable instruction files,
specification, ADRs, contracts, tests, release priorities and dependencies.
Follow the documented authority order. Trace each requirement to the relevant
source section; use the project's terminology. If sources disagree, identify
the conflict and stop work on the dependent decision. Separate confirmed
requirements, assumptions, open questions and non-goals.

Confirm the task's prerequisites. A missing external service, human approval,
hardware device or credential is a blocker, not permission to bypass it.
Where the approved contract permits, design an isolated fake or interface
for local progress and clearly label what still requires real verification.

## Make acceptance observable

State the expected user or caller behavior, failure behavior, compatibility
constraints, security boundaries and relevant performance or resource targets.
Do not invent numeric targets. Define positive and negative acceptance cases
and the evidence needed for each. Identify supported targets and deployment
conditions. For a hardware or integration requirement, specify the actual
test needed rather than equating a mock with production evidence.

## Sequence the smallest useful increment

1. Confirm scope, dependencies, existing implementation and decisions.
2. Change contracts or schemas first only when the task requires it; use
   existing generators and forward migrations rather than editing generated
   code or applied migrations.
3. Implement a cohesive vertical increment, preserving existing architecture,
   dependency policy and interfaces unless changes are explicitly authorized.
4. Add or update tests alongside the behavior, including failure, security
   and regression cases. Update relevant configuration and documentation.
5. Run applicable checks, review the diff and report outstanding evidence.

Keep tasks ordered by dependency rather than by guessed file counts.
Name likely modules and files only after inspecting the repository. Identify
parallelizable work only where state and contracts do not conflict. Avoid
unrequested tooling, infrastructure or abstractions. Escalate decisions
that are hard to reverse or affect security, privacy, signing, persistence
compatibility or deployment commitments.

## Deliver the plan

For nontrivial tasks, use PLAN.md in this skill as a structure for the
response. It is not a command to create a file. Include the goal, source
requirements, non-goals, dependency order, affected interfaces, acceptance
tests, verification commands, risks and unresolved decisions. For a plan-only
request, inspect read-only and return the plan; write a file only when asked.
An approved plan does not imply permission to commit, push, merge or deploy.
For an implementation request, proceed with independently authorized work
and stop at the unresolved decisions.

## Verification

Check traceability: each confirmed requirement maps to a task and observable
acceptance criterion; each task maps to a confirmed requirement or approved
prerequisite. Inspect actual repository commands, workspace, MSRV and feature
matrix before proposing checks. For planning-only work, do not claim the
proposed checks have run. If implementing, run the configured formatting,
clippy, unit and integration checks at the project's lint level, using
-D warnings only when no lint policy exists. Report actual outcomes and
separate unverified platform, deployment and hardware behavior. Do not mark
acceptance complete until the required evidence exists.

Route design decisions to `/rust-architecture`, security to `/rust-security`,
test design to `/rust-testing`, and behavior-preserving restructuring to
`/rust-refactoring`.

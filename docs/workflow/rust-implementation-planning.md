## What it does

A plan translates authorized requirements into a bounded sequence of verifiable changes. It does not create new requirements, approve a risky decision or authorize implementation when the user requested planning only.

## When to reach for it

Model-invoked. Plan a nontrivial Rust feature, migration increment or multi-file implementation from the project's specification. Use for implementation plans, delivery sequencing, acceptance criteria, dependencies and unresolved requirements. Not for routine single-file fixes, standalone system architecture, independent review or authorizing changes merely by writing a plan. Users can also invoke it directly by name.
The skill supplies guidance for the authorized task, not permission to edit.

## Implementation Planning decisions

Read the authoritative requirements, inspect the existing project and map
each confirmed requirement to tasks, dependencies and measurable acceptance.
Identify open decisions and blockers without inventing requirements. Keep
plans proportionate to the change, and do not treat a plan-only request as
permission to modify the code.

## Common questions

**Does a plan approve a new technology?** No. Obtain the relevant decision before dependent implementation.

**Can mock tests close a hardware acceptance criterion?** No. Record the required real-device verification separately.

## It's working if

- Requirements, non-goals and open decisions are distinguishable.
- Tasks are ordered by actual dependencies and acceptance is observable.
- Security, contracts, migrations and verification are addressed when relevant.
- No implementation or successful check is claimed for planning-only work.

## Where it fits

Works alongside rust-architecture, rust-security, rust-testing and rust-refactoring. See rust-skills-map for the full routing table.

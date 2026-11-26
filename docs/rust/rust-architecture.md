## What it does

Choose the simplest structure that satisfies current requirements and makes the important invariants enforceable. Do not replace a working architecture because a named pattern looks cleaner.

## When to reach for it

Model-invoked. Design or review module, crate and component boundaries in a Rust application. Use for structural design, dependency direction, service decomposition, responsibility separation and choosing justified abstractions. Not for public API compatibility, routine refactoring, defect diagnosis or deployment configuration. Users can also invoke it directly by name.
The skill supplies guidance for the authorized task, not permission to edit.

## Architecture decisions

Choose module, crate or process boundaries based on actual responsibility,
dependency and operational requirements. Prefer concrete dependencies and
narrow interfaces; introduce a trait or new service only when the task
justifies its cost. Keep domain rules, orchestration and external adapters
cohesive, with explicit ownership of transactions and failure behavior.

## Common questions

**Should every service implement a trait?** No. Use a trait when genuine variation or a required boundary warrants it.

**Must a 500-line file be split?** No. Review its cohesion and change only the relevant responsibility.

## It's working if

- The design names the requirements and reasons for each new boundary.
- Existing deployment constraints and public contracts are preserved unless approved.
- Dependency direction, authorization, error and resource ownership are explicit.
- Relevant implementation checks run, or unverified claims are identified.

## Where it fits

Works alongside rust-api-design, type-driven-design, rust-security and rust-refactoring. See rust-skills-map for the full routing table.

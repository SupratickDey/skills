---
tags: [rust-architecture]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

Improve the internal structure of submit so validation and amount calculation are distinct from orchestration and the existing concrete Ledger collaborator owns recording. Preserve the public signatures, error precedence, event contents, ordering and all observable behavior. No new dependencies, processes, traits for speculative alternatives or public helper APIs. Add focused tests and run the relevant project checks. Explain the resulting responsibility boundaries.

Input files: Cargo.toml, src/lib.rs

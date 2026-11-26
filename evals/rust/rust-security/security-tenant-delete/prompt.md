---
tags: [rust-security]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

Fix the authorized tenant deletion operation. Principal is already authenticated by the trusted caller. Only principals with can_delete may delete a record belonging to their own tenant. All denials and missing records must return false without modifying the store; do not reveal whether an out-of-tenant record exists. Preserve the public signature and existing successful behavior. Do not introduce dependencies or bypass permission checks. Add negative and positive regression tests and run the project checks.

Input files: Cargo.toml, src/lib.rs

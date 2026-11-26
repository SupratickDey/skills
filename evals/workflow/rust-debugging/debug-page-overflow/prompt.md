---
tags: [rust-debugging]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

Fix this pagination defect with the smallest coherent change. The public page function must return up to limit bytes starting at offset, return an empty slice when offset is beyond the input, and never panic for any usize offset or limit. Preserve its signature, existing normal behavior and unrelated code. Add a regression test, explain the root cause and run applicable checks.

Input files: Cargo.toml, src/lib.rs

---
tags: [rust-code-review]
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

Review the entire library for production readiness. Its public byte-reading
API must handle invalid offsets without panicking. Write REVIEW.md, and do not
modify the implementation or build configuration. Continue the static review
if the build fails.

Input files: Cargo.toml, src/lib.rs

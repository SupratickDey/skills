---
tags: [rust-implementation-planning]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

Prepare a read-only implementation plan for the export feature described in docs/spec.md. Read the existing crate and the authoritative requirements. Do not modify or create files. Separate confirmed requirements from open decisions, state prerequisites and blockers, sequence implementation and specify acceptance and verification. Do not invent a page-size limit or retention duration, approve deployment, or claim tests ran merely because you listed them.

Input files: Cargo.toml, docs/spec.md, src/lib.rs

---
tags: [rust-config]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

Correct the runtime worker-count parser. An absent value uses 4; an explicit value must be a decimal integer between 1 and 64 inclusive. Reject empty, malformed, overflowing and out-of-range values rather than using a fallback. Preserve the public function signature and error type. Do not introduce dependencies or change the process environment. Add regression tests and run the relevant Cargo checks.

Input files: Cargo.toml, src/lib.rs

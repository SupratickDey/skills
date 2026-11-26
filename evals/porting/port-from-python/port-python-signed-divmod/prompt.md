---
tags: [port-from-python]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

Port calculator.py to a standalone Rust CLI using the existing Cargo project. Preserve the explicitly bounded i64 input and output contract including stdout, stderr and exit status. No PyO3 or extra dependencies. Cover all sign combinations, exact division, zero, malformed input and i64 minimum divided by -1. Compare the actual programs on the same inputs, record counts and differences, and run applicable Cargo checks.

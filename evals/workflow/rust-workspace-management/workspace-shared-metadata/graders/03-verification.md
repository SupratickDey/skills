---
type: llm
focus: trace
weight: 1
---

The agent runs cargo check or build and tests for the workspace and for each
member with -p, and inspects effective metadata (for example cargo metadata
--no-deps). The agent runs the relevant Cargo checks (build, tests and clippy
at the project lint level or -D warnings when none is configured), reports the
actual outcomes, and does not claim a command passed that it did not run or
that failed.

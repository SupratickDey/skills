---
type: llm
focus: trace
weight: 1
---

Regression tests cover tied timestamps across a page boundary, a full walk
over all pages, both limit bounds and malformed cursors. The agent runs the
relevant Cargo checks (build, tests and clippy at the project lint level or -D
warnings when none is configured), reports the actual outcomes, and does not
claim a command passed that it did not run or that failed.

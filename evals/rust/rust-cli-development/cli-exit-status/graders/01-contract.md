---
type: llm
focus: trace
weight: 1
---

Exit statuses match README.md: 0 with at least one match, 1 with none, 2 for
usage errors and unreadable files. Counts are written to stdout only;
diagnostics name the problem and go to stderr. Missing arguments and
unreadable files no longer panic. The count output format and argument order
are unchanged.

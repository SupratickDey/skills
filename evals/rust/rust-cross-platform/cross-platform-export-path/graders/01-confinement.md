---
type: llm
focus: trace
weight: 1
---

Path handling uses std::path components rather than string matching or
format!-joined separators. Empty names, absolute or rooted paths, drive and
UNC prefixes and parent components (including a trailing "..", "a/../b" and
backslash forms on Windows) return InvalidName; nested names like 2026/q1
still produce a path under export_dir ending in .csv.

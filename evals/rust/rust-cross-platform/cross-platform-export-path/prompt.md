---
tags: [rust-cross-platform]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

export_path decides where a user-named report is written inside the export directory. It was written and tested on Linux only, and the service also runs on Windows and macOS. Fix it so that the returned path is always inside export_dir on all three platforms: a report name may contain nested subdirectory names (for example 2026/q1), but an empty name, an absolute or rooted path, a Windows drive or UNC prefix, or any parent-directory component must return ExportError::InvalidName. The file name gets the .csv extension as today. Also make display_name safe for paths that are not valid UTF-8. Keep the public function names, parameters and error type and do not add dependencies. Add regression tests, with Windows-specific cases compiled only on Windows, and run the project checks.

Input files: Cargo.toml, src/lib.rs

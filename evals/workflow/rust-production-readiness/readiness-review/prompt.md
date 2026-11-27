---
tags: [rust-production-readiness]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

This worker service is about to get its first production deployment, using the Kubernetes manifest in deploy/worker.yaml. Assess its production readiness. Write your assessment to READINESS.md: an overall verdict, then each readiness gate you checked with its result (passed, failed, blocked or not applicable) and the evidence for it, and the changes you recommend in priority order. Do not modify the source code or the manifest. Run the project checks that are available and report what they show.

Input files: Cargo.toml, src/lib.rs, src/main.rs, deploy/worker.yaml

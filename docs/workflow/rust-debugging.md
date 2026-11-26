## What it does

Diagnoses defects in existing Rust implementations through a reproducible
failure, evidence-led root-cause analysis and a focused correction. The
defining constraint is preserving behavior outside the defect while proving
that the actual cause is corrected.

## When to reach for it

Model-invoked when fixing bugs, failing tests, compiler errors, crashes or
regressions in existing Rust code. Users may invoke it directly by name.
Feature design is out of scope, and a read-only review belongs to
rust-code-review.

## From failure to verification

Establish the expected behavior and baseline, reproduce safely, trace the
failing path, and test hypotheses with targeted observations. Add a regression
test when practical. Apply a complete but contained correction; preserve
existing interfaces, names and unrelated changes. Run the original reproduction,
relevant tests and project checks. If reproduction is blocked, distinguish
static evidence from an executed result.

## Common questions

**What if the smallest change would hide the underlying issue?** Correct the
cause with the smallest coherent change, not the smallest possible line count.

**Can it rewrite the implementation?** Only where necessary and authorized.
Do not replace a working implementation as a shortcut to fixing one defect.

## It's working if

- Expected and actual behavior, affected paths and root cause are recorded.
- The correction stays within the authorized scope.
- A focused regression test detects the old defect where practical.
- The original reproduction and relevant checks pass, or blockers are reported.
- Existing tests, validation and security controls remain intact.

## Where it fits

Routes specialized decisions to rust-testing, ownership-not-clone,
rust-errors, async-rust, rust-concurrency and rust-performance. Use
rust-code-review for independent review. See rust-skills-map.

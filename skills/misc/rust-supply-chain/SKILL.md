---
name: rust-supply-chain
description: Audit a Rust dependency tree — advisories, licences, banned and duplicate crates, and unmaintained dependencies — and turn each finding into a decision. Use when checking whether dependencies are safe to ship, when cargo audit or cargo deny reports something, when adding a dependency to a project with a licence policy, when a build pulls in two versions of the same crate, or when the user asks about supply chain risk in Rust.
---

# Rust Supply Chain

An audit that ends in a list of advisory IDs has done the easy half. The hard
half is saying, per advisory, whether this repo actually reaches the vulnerable
code path and what to do about it.

## What this covers, and the one rule

Four questions: is anything we depend on known-vulnerable, is anything
unmaintained, does every licence in the tree comply with the policy, and is
the tree carrying weight it does not need. Each added dependency expands the trust boundary and can increase build time
or binary size. Build scripts and proc macros execute code on the build host.
Read `Cargo.lock` for resolved package versions and sources, then inspect the
actual selected workspace members, target triples, dependency kinds and features.
The lockfile can contain dependencies not used by a particular artifact. Read
MSRV from project posture or manifests and verify with the supported toolchain. The rule: **every finding ends in a decision** —
upgrade, replace, patch, vendor a verified fix, or request a time-bounded risk
acceptance from the responsible owner. A pin or vendoring alone does not fix a
vulnerability. An
unactioned advisory list is noise, and noise trains people to ignore the tool.

## Two tools, overlapping on purpose

`cargo audit` reads the RustSec advisory database and answers exactly one
question: is anything in the tree known-vulnerable. `cargo deny` answers four
— `advisories`, `bans`, `licenses`, `sources` — including that same one,
against a policy file; without one, built-in defaults apply. Defaults are not
a substitute for a project's approved policy. Record tool version, advisory
database freshness and coverage; a successful scan is not proof of safety. A repo running `cargo deny check` does not
need `cargo audit` separately; a repo that wants only advisory checking and no
policy file is better off with `cargo audit` alone. Say which the repo should
run and why, rather than adding both. The policy file in full, annotated, is
in `DENY.md`; it lands in the target repo only on explicit request.

## Reading an advisory properly

An ID and a severity are the start. Assess applicability using the advisory's affected versions, features,
platforms and preconditions. A build-only dependency is not automatically safe:
it may execute with access to CI credentials, source or artifacts. Review host
and runtime exposure separately. If reachability is uncertain, say so and do
not downgrade solely because a vulnerable call was not found. The mechanics: `cargo tree --invert
<crate>` shows who pulled it in, which tells you whether the dependency is
direct (you upgrade) or transitive (you upgrade the intermediary, or coordinate with its maintainer). Select an unaffected compatible version,
verified upstream patch, replacement or temporary approved mitigation. If no
fix is available, identify affected assets, exploit prerequisites, compensating
controls, owner, expiry and re-check trigger. Do not silently add ignore rules.

## Unmaintained is a finding, not a warning to mute

RustSec issues `RUSTSEC-*` unmaintained notices with no vulnerability
attached. Treat them as a maintenance-planning signal with a horizon, not an
emergency: note the crate, check whether a maintained fork has consensus, and
decide whether to move now or watch it.

## Duplicates are a licence and a binary-size problem before they are a taste problem

```bash
cargo tree -d
```

Cargo generally unifies compatible versions when requirements allow it;
conflicting compatible requirements can fail resolution. Multiple versions or
sources can coexist, but not every lockfile entry is compiled into a shipped
artifact. Inspect package IDs, features, target and dependency kinds before
claiming size or licence impact. Distinct package identities can produce
incompatible public types even when their names look identical. That is also the
price of splitting everything into tiny single-purpose crates; the
composability is real, and so is the version skew. The fix is usually raising a lower bound so
the two ranges unify, not banning the crate. `cargo deny check bans` is what
keeps a resolved duplicate resolved.

## Version requirements say how much drift is allowed

A bare `"1.4"` means `^1.4`: any compatible newer release. `"~1.4.2"` allows
patch releases only, `"=1.4.2"` pins one exact version, and `"*"` accepts
anything. Prefer the bare form (`"1"` or `"1.4.23"` as the lower bound the
code truly needs). An exact pin in a library can make otherwise compatible dependency requirements
unsatisfiable. Prefer compatible ranges with accurate lower bounds; document
and review deliberate exceptions, such as a tightly coupled proc macro and
runtime crate. A wildcard permits uncontrolled compatibility drift.

Commit `Cargo.lock` for an application and follow the repository policy for
libraries; a committed library lockfile helps reproduce contributor and CI
builds but does not constrain consumers. Verify application builds with
`--locked` where a committed lockfile exists. Pin toolchains and relevant build
inputs too; a lockfile alone does not guarantee reproducible binaries.

## Adding or updating a dependency

Start with the requirement and existing capabilities; avoid a new dependency
when existing code is sufficient. Compare maintenance, MSRV, feature footprint,
license, provenance, transitive graph and build-time execution. Review changes
to `Cargo.toml`, `Cargo.lock`, `.cargo/config.toml`, build scripts and git sources.
Use approved sources and immutable revisions for deliberate git pins; review
patches and vendor changes. Do not execute unknown dependency build scripts with
production secrets or privileged credentials. Use least-privilege isolated
builds, controlled network access and trusted caches. Do not add a second
runtime or change the public API just to accommodate a dependency update.

To see why a feature is on, or which dependency turns it on:

```bash
cargo tree --edges features --invert <crate>
```

## Licence policy is a decision the repo owns, not one this skill imports

The axis runs from permissive-only to copyleft-tolerated. `deny.toml` needs an
explicit allow-list either way, and crates with no licence metadata at all
need a per-crate exception with a reason attached. Do not ship an opinion
about which licences a user may accept — name the axis, let the repo decide,
and record the decision in the policy file.

Treat license metadata as evidence, not legal approval. Obligations depend on
license terms, distribution, linking and actual use; review SPDX expressions,
notices, exceptions and any missing metadata with the policy owner. Do not infer
permission from an upstream README alone or treat all copyleft licenses as
identical. Changing license or default features can affect consumers and needs
compatibility and policy review.

## Licensing the crate itself

When the repo is a crate it publishes, the ecosystem default is the dual
licence `MIT OR Apache-2.0`: `license = "MIT OR Apache-2.0"` in the manifest
and both licence texts shipped as files in the repo root, matching the Rust
project. Offer it as the default when the user has no preference; if they have
chosen another licence, keep theirs and make sure the manifest field and the
licence files agree with each other.

## What to run on a schedule instead of on every commit

The advisory database changes without the code changing, so an audit belongs
on a weekly schedule and on dependency-change pull requests — not in a
pre-commit hook, where it costs network time on every commit. If the repo
wants that wired into CI, run the `/setup-rust-ci` skill — it writes the
workflow.

## Verification

```bash
cargo deny check            # advisories, bans, licenses, sources
cargo audit                 # if the repo uses it standalone
cargo tree -d
cargo tree --edges features   # which dependency enables which feature
cargo update --dry-run      # inspect proposed resolution changes; not a security check
```

Run configured checks for the supported targets, features and workspace members.
Check installed tool versions and the project's lockfile policy first; avoid
unrequested lockfile changes. For an approved update, compile and test with the
supported MSRV and target matrix. Review the dependency diff and rerun the audit
against the resulting resolution.

Report exit codes, not just output: `cargo deny check` exits non-zero on any
denied finding, and that exit code is what a CI job keys on. If a tool is not
installed, say so and give the install line — never report a clean audit that
did not run.

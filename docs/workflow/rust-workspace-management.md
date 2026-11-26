## What it does

Cargo package graph, features and release boundaries. It applies to the approved project and its supported environments,
not to speculative changes or unrequested tooling.

## When to reach for it

Model-invoked: Manage existing Rust Cargo workspaces, package selection, dependency resolution, feature unification, MSRV and multi-crate release compatibility. Use for member additions or moves, shared dependency changes, resolver conflicts or feature-matrix failures. Not for initial lint setup, component architecture decisions or advisory triage. Users can invoke it directly by name.

## Decisions and verification

### Inspect the effective package graph

Read the root and member manifests, Cargo.lock policy, toolchain, resolver,
workspace members, default-members and excluded paths. Use cargo metadata
with --no-deps for inventory and appropriate resolved metadata or cargo tree
for dependency and feature analysis. Inspect the selected target and features;
a package's manifest does not alone describe the resolved graph. Distinguish
normal, build, development and target-specific dependencies.

Preserve existing package names, source identities, public paths and supported
toolchains. Ask before changing the resolver, edition, lockfile format, minimum
compiler or publish strategy. Route component decomposition to
`/rust-architecture` and initial lint setup to `/setup-rust-skills`.

### Inheritance and feature contracts

Use workspace.package, workspace.dependencies and workspace.lints only when
shared values fit the members. Workspace dependency inheritance shares a
declaration, not necessarily one resolved crate version. Default features
enabled in an inherited dependency declaration cannot be disabled by a member;
check actual feature selection when consolidating declarations. Cargo lint
inheritance is all-or-nothing for a member; do not combine it with explicit
member lint tables.

Features are additive where feasible. Preserve existing feature names and
default behavior. Use dep: feature syntax or weak dependency features only
when supported by the minimum toolchain and contract. Feature unification
can enable a dependency feature through a second consumer; inspect the
feature graph rather than assuming no-default-features disables it globally.
Avoid an unconditional all-features check for mutually exclusive modes.
Select and test supported combinations explicitly.

### Package changes and release boundaries

For a member move or addition, update paths, membership, dependency references,
build scripts, CI and packaging according to the existing structure. Do not
split a crate merely to satisfy a directory convention. Check duplicate
versions and incompatible public dependency types; route supply-chain policy
to `/rust-supply-chain` and public compatibility to `/rust-api-design`.
Preserve committed lockfiles except for changes justified by resolution;
never delete a lockfile to hide a dependency conflict.

Identify publishable versus internal crates, path dependency publication
constraints, package contents and release order. Do not publish or tag without
authorization. Use a version-compatible dry run or package inspection and
report unavailable registry prerequisites.

### Verification

Compare before and after metadata, package selection and resolved features.
Use cargo tree -e features and cargo tree -d where applicable. Run format,
clippy and tests for the supported package/feature/target matrix, including
individual consumers that might otherwise pass only because of feature
unification. Use the configured lint level (-D warnings only when none
exists). Verify declared MSRVs and lockfile behavior on actual toolchains
where available. Report the exact checks, blockers and unintended graph
changes.

## Common questions

**Does this skill authorize a new dependency or supported environment?** No.
Inspect existing choices and obtain approval for a material change.

**What if the required verification environment is unavailable?** Report
what was inspected or simulated, and distinguish the missing execution evidence.

## It's working if

- Package selection and effective feature behavior are explicit.
- Inherited settings are valid for each selected member.
- Public dependency compatibility and lockfile policy are preserved.
- The supported package and feature matrix is actually checked.

## Where it fits

Use `/setup-rust-skills` for related concerns. See [rust-skills-map](../workflow/rust-skills-map.md)
for the full routing table.

# Rust CI workflows

The workflow file in full, ready to adapt, plus the variants. Every command
here must also be one a contributor can run locally. The posture
recorded in `docs/agents/rust.md` decides which sections apply — MSRV adds the
`msrv` job, `no_std` swaps the test job for a build, `unsafe` earns the Miri
job — and the base never ships unexamined.

## The base workflow

Illustrative single-crate workflow for a project whose full feature union is
supported. Replace action refs with reviewed immutable SHAs before adoption;
select the approved toolchain, packages and feature sets. Never expose secrets
to untrusted pull request code.

```yaml
name: Rust
on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

env:
  CARGO_TERM_COLOR: always

jobs:
  fmt:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt
      - run: cargo fmt --check

  clippy:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy
      - uses: Swatinem/rust-cache@v2
      - run: cargo clippy --all-targets --all-features

  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
      - run: cargo test --all-features
```

The clippy job carries no `-D warnings` on purpose: the level comes from the
repo `[lints]` block, and adding the flag would override a level the user
deliberately set. The flag belongs in this file only in the fallback form —
`cargo clippy --all-features --all-targets -- -D warnings` — for a repo with
no lint configuration at all. The other legitimate fallback form sets
`RUSTFLAGS: -D warnings` in the job `env`; use one or the other, never both,
and never alongside a lint block the repo already set. Doc warnings are a
separate flag, `RUSTDOCFLAGS`, shown in the library scenario below.

Pin the toolchain to match `rust-toolchain.toml` where the repo has one:
give the toolchain action the same version in place of `@stable` (for example
`dtolnay/rust-toolchain@master` with `toolchain: 1.85.0`), or use the installed toolchain selected by the repository pin after confirming
its components are available. A job that floats on `stable` while the
repo pins a version tests a compiler nobody develops with.

## The MSRV job

Generate a reviewed matrix from effective package metadata and the supported
feature/target policy. Do not use packages[0] to select a workspace MSRV.
The following values are examples, not facts about the target project.

```yaml
  msrv:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        include:
          - package: example-core
            toolchain: "1.75.0"
          - package: example-cli
            toolchain: "1.85.0"
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: dtolnay/rust-toolchain@master
        with:
          toolchain: ${{ matrix.toolchain }}
      - run: cargo +${{ matrix.toolchain }} build -p ${{ matrix.package }}
```

Replace the example package names, versions and commands with approved
values. Explicit toolchain selection avoids a repository pin overriding the
MSRV run. Add --locked only when the committed lockfile works with the
supported Cargo version and the project requires locked resolution. Include
supported feature and target combinations. A library MSRV build need not
include newer development-only dependencies; explain test coverage separately.
Replace illustrative action refs with reviewed immutable SHAs before adopting
the workflow.

## The Miri job

Gated on the unsafe policy — included only when the repo actually contains
`unsafe`, and always on `nightly`:

```yaml
  miri:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: dtolnay/rust-toolchain@nightly
        with:
          components: miri
      - run: cargo miri test
```

## The no_std variant

`--target thumbv7em-none-eabihf` plus `targets:` on the toolchain action:

```yaml
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: thumbv7em-none-eabihf
      - run: cargo build --target thumbv7em-none-eabihf
```

This job only builds the bare-metal target. Run supported host tests and
separate target-runner tests when available; do not equate compilation with
execution.

## A workspace note

Select --workspace for commands that should check all members, or select
packages explicitly when their supported configurations differ. Do not
assume root default-members include every package. A virtual workspace has
no root package; inspect effective metadata for each member. Use explicit
supported feature combinations rather than an unconditional all-features
invocation. Keep host tests for no_std libraries when supported, and label
bare-metal builds separately from executed tests.

## Feature combinations and platforms

```yaml
  features:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
      - uses: taiki-e/install-action@cargo-hack
      - run: cargo hack check --workspace --feature-powerset --no-dev-deps
```

Each independent feature doubles the configurations, so the powerset grows
exponentially. With more than a handful of features, trim it with
`--depth 2` (every pair) or run the job on a schedule instead of each push.
Features that are mutually exclusive need an exclusion flag, or a separate
step per valid set. For code that differs per platform, run the test job on
`runs-on` entries for each OS that has its own code path, as a `matrix`.

## Advisories and dependency policy

```yaml
  deny:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: EmbarkStudios/cargo-deny-action@v2
```

Add a `schedule` trigger (weekly cron) to the workflow `on:` block for this
job, since new advisories land independently of commits. The policy file,
`deny.toml`, is what `/rust-supply-chain` helps decide; do not invent one
here. A repo that only wants advisories can run `cargo audit` in its place.

## Generated-code drift

For a repo that commits output produced by a generator, regenerate in CI and
fail if anything changed:

```yaml
  generated:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo run -p codegen
      - run: git diff --exit-code
```

The command that regenerates is whatever the repo documents; the same
command, run locally, is what a contributor uses to fix a red job. A new
untracked output file will not show in `git diff`, so also run
`git status --porcelain` and fail on any output, or `git add -N .` first.

## Process checks

When a recurring mistake can be detected by a command, a small job that runs
it is cheaper than reviewing for the mistake. Write the job first so it fails
on the existing instances, fix them, and the check keeps the problem fixed.

## Three worked scenarios

**A single binary crate, no MSRV commitment.** The base workflow as written:
three jobs — `fmt`, `clippy`, `test`. No `msrv` job because nothing in the
repo commits to an old toolchain, and no Miri job because there is no
`unsafe`.

**A library with an MSRV and published docs.** The base, plus the `msrv` job,
plus a doc job that treats doc warnings as errors:

```yaml
  doc:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      RUSTDOCFLAGS: -D warnings
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo doc --no-deps
```

**A workspace with existing CI.** The skill mostly reports the difference
between the existing workflow and what the recorded posture would produce, and
leaves things alone — the existing file wins unless the user asks for the
change.

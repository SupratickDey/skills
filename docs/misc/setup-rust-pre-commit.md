## What it does

Sets up a fast pre-commit hook for a Rust repo — perform fast, read-only checks triggered by relevant staged changes. The defining constraint: a hook is a
convenience, never a gate. CI is the gate — it runs on every push whether or
not a local hook ever fired — and a hook that tries to be the gate gets slow,
and a slow hook gets bypassed with `--no-verify` within a week.

## When to reach for it

User-invoked: the user runs it on purpose, typically as
`/setup-rust-pre-commit`. A hook executes on someone's behalf at every
commit, so the model never decides on its own to run it. The trigger
boundary: contributors keep pushing unformatted code and CI is catching it
late. It does not write the CI workflow — that is `/setup-rust-ci` — and it
does not change the lint level; the level is read from the recorded posture,
never added as a flag.

## Prerequisites

The recorded posture in `docs/agents/rust.md`, read exactly as
`/setup-rust-ci` reads it — including the clippy command it records, at the
level configured in `Cargo.toml`. If the file is absent, the skill says so
and offers to run `/setup-rust-skills` first; it does not guess a level and
bake the guess into a hook. And write access to the hook files the mechanism
needs and to the contributing notes.

## Which mechanism

Three, and the choice is the user's. The skill detects what is already there
— an existing `.pre-commit-config.yaml`, `lefthook.yml`, or `core.hooksPath`
setting — and matches it rather than introducing a second mechanism.

| Mechanism | Fits when | Costs |
|---|---|---|
| `core.hooksPath` script | Rust-only repo, no other hook needs | Each contributor runs one `git config` line; nothing enforces that they did |
| `lefthook` | Mixed repo, wants parallel hooks, no Python | One binary dependency |
| `pre-commit` | The repo already uses it for other languages | Python toolchain, and the Rust hooks shell out to cargo anyway |

The complete files for all three, ready to paste, are in `HOOKS.md`.

## What goes in the hook

Prefer report-only formatting and optional package-level clippy at the
configured lint level. Cargo fmt and clippy do not check an arbitrary list
of staged files. Use the staged path inventory only to decide whether a
check is necessary. A working-tree check must be labeled as such; for
exact index-only verification use an isolated snapshot.

Preserve the user's hook manager, Git configuration, index and working
tree. Reject partial staging when using the conservative working-tree
template. Do not automatically rewrite or restage files. Test the hook in
a disposable repository rather than making probe commits and resets in
the user's project.

## Common questions

**Is a two-second hook guaranteed?** No. Measure actual latency and move
slow or network-bound checks to CI.

**Can a hook lint individual Rust files with cargo clippy?** No. Select
the appropriate compilation units and documented feature settings.

**Can the model run this setup automatically?** No. Both harness invocation
flags require explicit user invocation.

## It's working if

- The hook detects relevant changes without unsafe filename splitting.
- Clean and malformed inputs produce the expected result in isolation.
- Partially staged content and user history remain untouched.
- Actual formatter checks and shell-only checks are reported separately.
- Existing hooks, configuration and CI requirements are preserved.

## Where it fits

`setup-rust-pre-commit` is the hook skill in the `misc` bucket — the
commit-time convenience that makes bad formatting visible before it is
pushed. It reads the posture `/setup-rust-skills` writes, defers every real
gate to `/setup-rust-ci`, and keeps the network-bound checks of
`/rust-supply-chain` out of the hook entirely. See `rust-skills-map` for how
the full set of Rust skills relates.

# Contributing

## Agent instructions

`AGENTS.md` is the canonical authoring and engineering policy for both coding
agents. `CLAUDE.md` imports it; keep platform-specific additions in the wrapper
only when necessary. The rules govern this repository and do not automatically
install policy in consumer projects. Read the applicable `.agents/` rules
before editing skills.

## Propose before you build

Open an issue before writing anything. Describe the skill or the change you have
in mind, what task shape would pull it in, and which existing skill it sits next
to. Wait for a maintainer to agree the change belongs in the set.

This is not ceremony. A skill is judged as much on what it refuses to cover as on
what it teaches — two skills whose descriptions both match the same task make the
set worse, not larger — and that judgement cannot be made from a finished pull
request without asking someone to throw work away. The issue is where the scope
gets settled, cheaply, before anyone has spent an evening on it.

Pull requests that arrive without an agreed issue may be closed with a pointer
back here, however good the content is.

## Branch model

Open development PRs against dev. Main remains release-only. A maintainer
promotes a verified, versioned dev candidate using a normal dev-to-main pull
request and a merge commit, preserving history. Do not squash, rebase or
force-push the release. The new main tree must match the approved dev tree.
See ADR 0008 and .agents/releasing.md. No elevated release token or custom
merge bot is required.

## Local skill harness

For manual development testing, run `scripts/link-skills.sh` from the checkout.
It links promoted skill directories into initialized Claude Code and Codex user
skill homes. It excludes in-progress skills, is idempotent for links to the
same checkout, and preflights collisions without replacing an existing skill.
If a different installation occupies a name, choose one installation route and
remove or relocate it yourself before retrying. Run `node --test tests/link-skills.test.mjs`
to verify the linker without touching your real skill directories.

This harness validates filesystem linking, not actual agent runtime discovery.
Restart the chosen agent and verify its visible skill list and invocation.

## Adding a changeset

For a user-visible change, run npx changeset and commit the generated fragment
under .changeset/ with the PR. Use an appropriate semantic version bump.
For a change that does not need a release note, a maintainer may apply the
skip-changelog label. Release-preparation PRs use this label because they
consume existing fragments.

The changeset-check workflow verifies a new or modified fragment in the PR's
own diff. It does not write commits, and an unrelated fragment already on dev
does not satisfy the check. Changesets uses its built-in Git-based changelog
generator; no GitHub API authentication is needed.

## Protected files

These five paths affect every consumer of the plugin, not just this repository, so
a change to any of them triggers an automatic warning comment on the pull request
from `protected-files-check`:

- **`.claude-plugin/plugin.json`** — verify the skills array still matches the set
  of promoted buckets, and that the version here agrees with `package.json`.
- **`.claude-plugin/marketplace.json`** — verify the entry still points at the
  correct plugin source and metadata.
- **`.agents/install-block.md`** — verify the install wording here still matches
  what is pasted into onboarding docs and the README, byte for byte.
- **`package.json`** — verify the version still agrees with `plugin.json`, and that
  a dependency change was intentional.
- **`.github/workflows/**`** — verify a workflow change was intentional and does
  not weaken a gate (branch restrictions, forbidden-path scans, permission checks).

## Releases

Releases are made by maintainers, and only from `main`. Nothing you do as a
contributor triggers one: your change ships when a maintainer next cuts a
release, and the changeset on your pull request is what puts it in the notes.

You do not need to pick a version, tag anything, or edit `CHANGELOG.md` — the
changelog is assembled from changesets, and a hand-edit to it will conflict.
The procedure itself lives in `.agents/releasing.md`.

## Cross-agent distribution checks

The fork's installation commands target SupratickDey/skills; retain upstream
attribution and plugin identifiers. Manual copy uses the promoted-bucket
installer and rejects collisions. Its tests use temporary destinations only.
Both managed manifests declare the same explicit promoted inventory; the
catalog gate rejects missing, extra and duplicate paths and broad roots. Do not claim managed
plugin discovery or invocation parity until tested in the actual agents.
Record agent versions, install scope, visible names, explicit and implicit
invocation checks, and cleanup. Check CLI availability before running tests.

## Runtime acceptance for both agents

Follow the versioned checklist in `.agents/cross-agent-verification.md`.
Static metadata checks and filesystem tests are prerequisites, not runtime
activation evidence. Keep results for each installed agent separately.

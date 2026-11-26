# 0008: Standard maintainer release

## Status

Accepted for this fork. Supersedes ADR 0004.

## Context

The inherited release bot requires a personal access token with branch bypass
permissions and a dedicated environment. The fork is independently maintained
and does not require a comment-triggered privileged merge service. The default
branch serves installable skills, so a deliberate release boundary is still
necessary.

## Decision

Keep dev for integration and main for released snapshots. Prepare a version
on a branch from dev using Changesets and the existing plugin-version sync.
Use the built-in Git changelog generator, which does not require GitHub API
authentication. Verify the prepared tree with npm run check and review the
version, lockfile, manifests and changelog before merging into dev.

Promote dev to main using an ordinary maintainer-approved GitHub pull request
and the merge-commit method. Do not squash or rebase the release PR: preserve
the integration history and keep main's content equal to the reviewed dev
tree. No force-push, elevated PAT, automated branch bypass or comment-triggered
merge is required. Only dev may be promoted to main.

Keep the existing full validation workflow and main pre-merge gate. The
changeset check is read-only and checks changes in the PR itself. CI may also
be dispatched manually. When CI is unavailable, run the same required checks
on the exact candidate checkout and record results in the release PR; missing
required checks are not passing results.

After promotion, the maintainer creates a GitHub release tagged vX.Y.Z at the
reviewed main commit and copies the corresponding changelog section into its
body. This is a separate authorized action; no npm publish is involved.

## Consequences

Main can contain normal release merge commits, unlike the original fast-forward
model. Its content must match the approved dev candidate. Preserve ancestry
and incorporate main into dev if necessary before future release preparation.
The maintainer is responsible for verification and publishing; the ordinary
repository permissions suffice. The custom merge, release-prep and release-note
workflows are removed. This decision does not disable CI, bypass existing
branch protections or waive validation. See .agents/releasing.md.

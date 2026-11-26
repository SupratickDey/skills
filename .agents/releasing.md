# Releasing

Maintainer-only. Contributions merge into dev; publishing a stable snapshot on
main is a separate authorized operation. See ADR 0008.

## Procedure

1. Start from an up-to-date checkout with a clean working tree. Confirm that
   dev contains all approved changes and their changeset fragments. Create a
   release-prep/vX.Y.Z branch from dev.
2. Assemble the version and changelog locally:

   ```bash
   npm ci
   npm run version
   npm install --package-lock-only --ignore-scripts
   npm run check
   ```

   Use the supported Node and Rust toolchains. The version is derived from the
   accumulated changesets, not chosen independently of them. Review the
   consumed fragments, CHANGELOG.md, package.json, package-lock.json and both
   plugin manifests. If the version is not the intended one, resolve the bump
   decision before committing. Do not run npm publish.
3. Open a release-preparation PR into dev with the skip-changelog label.
   Review and merge after the applicable checks pass. The label is appropriate
   because this PR consumes existing fragments instead of creating another.
4. Open or update the dev-to-main release PR. Require the full repository
   validation on the exact candidate, plus the main branch/forbidden-path gate.
   GitHub Actions can be used for the checks; when unavailable, reproduce the
   same checks locally and attach the results to the PR. Do not treat a missing
   or skipped required check as success. Confirm the reviewed head has not moved.
5. A maintainer merges the release PR using GitHub's normal merge-commit
   option. Do not squash, rebase or force-push. Verify the main tree matches
   the reviewed dev candidate. If it does not, stop before publishing.
6. Create a GitHub release at that main commit with tag vX.Y.Z and the matching
   CHANGELOG.md section as its notes. The tag must match package.json and both
   plugin manifest versions. No personal access token or custom bot is needed.

## Why the version is committed

The repository tree is the installable artifact. The existing version-sync
script mirrors package.json into the Claude and Codex plugin manifests, so
the version must be part of the reviewed tree before a tag is created.

## If Actions is unavailable

Enable workflows in the repository's Actions tab and check repository Actions
settings. The Check workflow can also be started manually. The release process
does not need a custom workflow token; ordinary GitHub permissions are enough.
Do not merge an unvalidated release merely because Actions is unavailable.

The former ff_merge environment, FF_MERGE_TOKEN and slash-command merge bot
are no longer used by the release process. Historical credentials should be
reviewed and revoked by their owner if no other workflow needs them.

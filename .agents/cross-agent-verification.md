# Cross-agent verification

Use an isolated disposable project and agent profile where the installed
agent supports one. Do not overwrite the user's existing installations.
Record the checkout commit, agent version, OS, installation route and scope.

## Static checks

Run npm run check, including the catalog, version and Rust example checks.
Run npm run check:install. It validates the Claude Code plugin, installs it
into throwaway Claude Code and Codex homes, and compares the skills each
agent exposes with the manifests; Codex must hide the user-invoked skills
from its implicit catalog. It needs both CLIs but no credentials. Verify both manifests
contain the same promoted directory paths, and the marketplace entries
resolve to the plugin root. Do not change permissions or use real secrets.

## Managed installation

For Claude Code add the fork marketplace and install rewrite-rs-skills
from rewrite-rs using the documented route. For Codex add the fork
marketplace using the supported CLI or plugin browser, then install the
same plugin. Restart or reload using the actual agent's instructions.
Check the visible inventory against the manifest. Use the agent's
actual qualified skill name or skill picker, not an assumed slash command.

## Activation and behavior

In each agent record evidence for these checks:

| Case | Expected |
| --- | --- |
| Explicit invocation of rust-skills-map | Router loads on explicit request |
| Routine Rust code review | Review guidance loads when appropriate |
| Unrelated non-Rust question | Rust skills do not load unnecessarily |
| Request to explain CI, without setup authorization | No setup writes |
| Explicit setup-rust-ci invocation | Setup guidance loads; changes stay within authorized scope |
| Python parity task | Python skill and relevant shared porting guidance, not unrelated languages |
| Experimental skill | Not exposed by the promoted inventory |

Check the actual loaded skill or trace where available. A model's assertion
that it used a skill is not sufficient evidence. Check both positive and
negative activation, read-only behavior, supported explicit invocation,
and whether references are loaded only as needed. For test tasks requiring
edits use synthetic fixtures and inspect the diff.

## Results

Record passed, failed, blocked or not applicable per case and per agent,
with command, evidence and agent version. Missing CLI, login, permissions,
or trace visibility is a blocker, not a pass. Remove only installations
created for the test using supported uninstall commands. Do not publish
or promote a release solely on static checks.

# Cross-agent evaluation

The eval cases under `evals/` measure whether the promoted skills improve an
agent's work. Each case runs twice per trial: a baseline arm with no
repository skills and a skills arm with every promoted skill installed as a
project skill. Two runners read the same cases.

- `npm run eval:claude` uses Claude Code's built-in `claude plugin eval`. It
  runs the plugin and a no-plugin baseline, grades each run with the case's
  graders using a model judge, flags whether a skill fired, supports a cost
  ceiling and writes an HTML and JSON report. Prefer it for Claude Code.
- `npm run eval:run` is the shared runner in `scripts/evaluate.mjs`. It
  drives Claude Code or Codex CLI with the same staging, isolation checks and
  trace parsing, and it is the route for Codex.

Static installation is checked separately and needs no credentials:
`npm run check:install` installs the plugin into throwaway Claude Code and
Codex homes and compares the skills each agent exposes with the manifests.
CI runs it with pinned CLI versions.

## Environment

Run agent executions in a disposable sandbox or VM with approved credentials,
limited network access and bounded resources, and no other installed skills,
plugins or personal agent instructions. The `--isolated-environment-confirmed`
flag is an operator attestation, not an isolation mechanism. Raw traces can
contain sensitive data; restrict access, review before sharing and delete them
after the approved retention period.

`claude plugin eval` confines shell tools with an OS sandbox. On Linux that
needs `bubblewrap` and `socat`; without them it refuses runs that grant Bash.

## Shared runner

```bash
npm run eval:list
npm run eval:run -- --agent codex --model MODEL --case port-python-signed-divmod --trials 2 --isolated-environment-confirmed
npm run eval:run -- --agent claude --model MODEL --case port-python-signed-divmod --trials 2 --isolated-environment-confirmed
```

What one run does:

1. Refuses unless the checkout is clean and committed, so the recorded
   revision describes what ran.
2. Creates the workspace in the system temporary directory, outside this
   repository, so neither arm inherits this repository's `AGENTS.md`,
   `CLAUDE.md` or skills.
3. Runs the case's own committed `stage-inputs.sh` in the empty workspace.
   Some cases do more than copy `inputs/`; `review-config-diff` also stages
   and applies `change.diff`.
4. For the skills arm, copies every promoted skill into `.claude/skills/`
   (Claude Code) or `.agents/skills/` (Codex), then commits the workspace so
   the agent's change can be captured as a diff.
5. Runs the agent with the prompt on standard input. Claude Code gets the
   case's `allowed_tools` as `--allowedTools`, `--max-turns`,
   `--setting-sources project,local` (no user settings or the plugins they
   enable) and `--strict-mcp-config`. Codex runs `codex exec --json` in the
   `workspace-write` sandbox; it has no turn cap, so compare arms within one
   agent and do not claim equal budgets across agents. On timeout the whole
   process group is stopped.
6. Checks which skills the arm could actually see: the `system/init` event
   for Claude Code, and `codex debug prompt-input` in the workspace for
   Codex. A baseline that can see any repository skill, or a skills arm that
   is missing a model-invoked skill, is recorded as `invalid` and never
   scored. When the agent reports no catalog, `visibilityChecked` is false.
7. Saves `stdout.jsonl`, `stderr.txt`, `workspace.diff` and
   `workspace-final/` (without `.git`, `target` and the injected skills) per
   run, and appends to `runs.json`. Add `--keep-workspaces` to keep the
   temporary workspace too.

Each record carries the revision, model, CLI version, a fixture hash over the
whole case directory, status and reason, wall time, exit code, token usage,
cost and turns where the agent reports them, tool calls in total and by name,
permission denials, and the skills the trace shows loading. Claude Code skill
use is a `Skill` tool call or a read of a skill's `SKILL.md`; for Codex it is
a command that reads `.agents/skills/<name>/SKILL.md`. Missing trace data is
unknown, never proof that a skill did or did not load. A Claude Code run with
permission denials usually means the case needs a tool its allowlist lacks.

## Grading

Grades are a JSON array of objects with `id` (matching `runs.json`),
`critical` (boolean), `evidence` (a nonempty string naming observed checks)
and `scores`, each from zero to one:

```json
[{"id":"example","critical":false,"evidence":"Observed test and review evidence","scores":{"correctness":1,"maintainability":0.8,"regression":1,"security":1,"scope":1,"evidence":1}}]
```

Weights are 30, 20, 15, 15, 10 and 10 respectively. A critical correctness or
security failure scores zero. An incomplete, timed-out, invalid or ungraded run
has no score, not a fabricated zero.

Grade by hand against the graders, or use the automated judge:

```bash
npm run eval:judge -- --runs target/agent-evals/RUN/runs.json --judge-agent claude --judge-model MODEL --isolated-environment-confirmed
```

The judge works in a temporary copy of each completed run's final workspace
with its diff, and sees the task, the expected outcome and the graders, never
the arm, the skills or the trace. It may run the project's checks. Grades it
cannot parse or validate go to `grades.auto.errors.json` and stay ungraded.
Each grade records the judge's agent, model and version. Spot-check judge
grades by hand before publishing results.

## Report

```bash
npm run eval:report -- --runs target/agent-evals/RUN/runs.json --grades grades.json
```

`--grades` may repeat. The output has `pairs` (baseline and skills arms of
each trial, with the score delta) and `summary`, one entry per agent, case,
model, CLI version, revision and fixture. Each entry reports trials, missing
arms, matched scored pairs, mean delta and every delta, and per arm the run,
completed, invalid and scored counts, mean score, wall time, tokens and tool
calls, and `targetActivation`: how many traced runs loaded a skill named in the
case's `tags`, with its denominator. Compare only matched cases and report
denominators and failures; do not generalize from a single trial.

CI runs the offline tests (including the runner, end to end, against stand-in
agent executables) and the installation check. It does not run paid or
authenticated agent executions.

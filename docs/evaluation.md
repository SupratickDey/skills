# Cross-agent evaluation

The shared runner reuses the existing case directories without executing their
scaffold scripts. It copies ordinary fixture files into fresh workspaces,
runs baseline and promoted-skill arms, alternates arm order by trial,
and records revision, model, CLI version, fixture hash, wall time, exit
status, available usage counters and observed tool calls. This tests
project-local skill discovery, not managed plugin installation.

## Run

Use a disposable external sandbox or VM with no inherited agent skills,
plugins, instructions or sensitive files, approved credentials, limited
network access and bounded resources. The confirmation flag is an operator
attestation, not an isolation mechanism. Agent CLI behavior, authentication,
sandbox enforcement and event schemas vary by version; verify them first.
The runner invokes installed CLIs without bypassing permissions. It does
not enforce the Claude-specific fixture tool allowlist or a Codex turn cap;
record these differences and compare arms within the same agent. Do not
claim cross-agent equivalence of budgets or token counters.

```bash
npm run eval:list
npm run eval:run -- --agent codex --model MODEL --case port-python-signed-divmod --trials 2 --isolated-environment-confirmed
npm run eval:run -- --agent claude --model MODEL --case port-python-signed-divmod --trials 2 --isolated-environment-confirmed
```

Use an approved model identifier. The output directory under target/ is
ignored by Git. Raw traces can contain sensitive data; restrict access,
review before sharing and delete after the approved retention period.
External isolation must also stop descendant processes on timeout.

## Grade and report

Review actual output files, source diffs, test logs and traces using the
case graders and expected outcome. Grade blind to arm where feasible.
Record a JSON array of objects with id (matching runs.json), critical
(boolean), evidence (nonempty string referencing observed checks) and
scores (each a number from zero to one):

```json
[{"id":"example","critical":false,"evidence":"Observed test and review evidence","scores":{"correctness":1,"maintainability":0.8,"regression":1,"security":1,"scope":1,"evidence":1}}]
```

Weights are 30, 20, 15, 15, 10 and 10 respectively. Critical correctness
or security failures score zero. An incomplete, timed-out or ungraded run
has no score, not a fabricated zero. Compare matched cases with identical
revision, fixture, model, agent version and trial. Report denominators,
missing arms and failures; do not generalize from a single trial.
Observe explicit and implicit skill activation separately using actual
trace evidence; missing trace data is unknown, not proof of activation.

```bash
npm run eval:report -- --runs target/agent-evals/RUN/runs.json --grades grades.json
```

The result is JSON with matched pairs and score deltas. No automatic
LLM judge, runtime benchmark result, cost estimate or managed installation
verification is implied. The existing Claude plugin eval route remains
available. CI runs only offline unit tests and fixture discovery, not
paid or authenticated agent executions.

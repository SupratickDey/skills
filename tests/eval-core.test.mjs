import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { collectSkills } from "../scripts/check-skills.mjs";
import {
  aggregate, buildArgv, buildJudgePrompt, checkVisibility, discover, expectedOutcome, extractJudgeGrade,
  parseClaudeEvents, parseCodexEvents, parseCodexPromptSkills, score, stage, summarize, weights,
} from "../scripts/eval-core.mjs";

const grade = (id, value = 1, critical = false) => ({
  id,
  critical,
  evidence: "Observed fixture checks",
  scores: Object.fromEntries(Object.keys(weights).map((key) => [key, value])),
});
const record = (id, arm, status = "completed", extra = {}) => ({
  id, arm, status, agent: "codex", case: "example", trial: 1, model: "test", version: "test",
  revision: "abc", fixtureHash: "hash", ...extra,
});
const jsonl = (...events) => events.map((event) => JSON.stringify(event)).join("\n");

test("weighted scores and critical failures", () => {
  assert.equal(score(grade("a", 0.5)), 50);
  assert.equal(score(grade("a", 1, true)), 0);
  assert.throws(() => score(grade("a", 2)));
  assert.throws(() => score({ ...grade("a"), evidence: "" }));
});

test("paired comparison requires completed graded arms", () => {
  const runs = [record("a", "baseline"), record("b", "skills")];
  assert.equal(summarize(runs, [grade("a", 0.5), grade("b", 0.8)])[0].delta, 30);
  assert.equal(summarize(runs, [grade("a")])[0].delta, null);
  assert.equal(summarize([runs[0], record("b", "skills", "timeout")], [grade("a"), grade("b")])[0].delta, null);
  assert.equal(summarize([runs[0], record("b", "skills", "invalid")], [grade("a"), grade("b")])[0].delta, null);
  assert.throws(() => summarize([...runs, runs[0]], []));
  assert.throws(() => summarize(runs, [grade("unknown")]));
});

test("aggregate reports means, denominators, missing arms and activation", () => {
  const expectedSkills = ["rust-config"];
  const runs = [
    record("b1", "baseline", "completed", { trial: 1, expectedSkills, elapsedMs: 100, skillActivations: [] }),
    record("s1", "skills", "completed", {
      trial: 1, expectedSkills, elapsedMs: 200, skillActivations: ["rust-config"],
      usage: { input_tokens: 10, output_tokens: 5 }, toolCalls: 4,
    }),
    record("b2", "baseline", "completed", { trial: 2, expectedSkills, elapsedMs: 300, skillActivations: [] }),
    record("s2", "skills", "completed", { trial: 2, expectedSkills, elapsedMs: 400, skillActivations: [] }),
    record("b3", "baseline", "failed", { trial: 3, expectedSkills }),
  ];
  const [summary] = aggregate(summarize(runs, [grade("b1", 0.5), grade("s1", 0.9), grade("b2", 0.6), grade("s2", 0.6)]));
  assert.equal(summary.trials, 3);
  assert.equal(summary.missingArms, 1);
  assert.equal(summary.matchedScoredPairs, 2);
  assert.equal(summary.meanDelta, 20);
  assert.deepEqual(summary.deltas, [40, 0]);
  assert.equal(summary.baseline.runs, 3);
  assert.equal(summary.baseline.completed, 2);
  assert.equal(summary.baseline.meanScore, 55);
  assert.equal(summary.skills.meanElapsedMs, 300);
  assert.equal(summary.skills.meanTokens, 15);
  assert.deepEqual(summary.skills.targetActivation, { activated: 1, of: 2, rate: 0.5 });
  assert.deepEqual(summary.baseline.targetActivation, { activated: 0, of: 2, rate: 0 });
});

test("fixture staging rejects symlinks and copies ordinary files", (t) => {
  const root = mkdtempSync(join(tmpdir(), "eval-core-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const src = join(root, "src");
  mkdirSync(src);
  writeFileSync(join(src, "data"), "example");
  stage(src, join(root, "dest"));
  assert.equal(readFileSync(join(root, "dest", "data"), "utf8"), "example");
  symlinkSync(join(src, "data"), join(src, "link"));
  assert.throws(() => stage(src, join(root, "other")), /Unsupported fixture/);
});

test("existing cases are discoverable with graders, tools and scaffolds", () => {
  const cases = discover(new URL("../evals/", import.meta.url).pathname);
  assert.ok(cases.length >= 17);
  for (const evalCase of cases) {
    assert.ok(evalCase.graders.length && evalCase.prompt, evalCase.name);
    assert.ok(evalCase.allowedTools.length > 0, evalCase.name);
    assert.ok(evalCase.tags.length > 0, evalCase.name);
    assert.equal(evalCase.scaffold, "stage-inputs.sh", evalCase.name);
    assert.match(evalCase.fixtureHash, /^[0-9a-f]{64}$/);
    assert.ok(expectedOutcome(evalCase.metadata).length > 20, evalCase.name);
  }
});

test("the fixture hash covers files outside inputs, such as a staged diff", (t) => {
  const root = mkdtempSync(join(tmpdir(), "eval-hash-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, "case");
  mkdirSync(join(dir, "inputs"), { recursive: true });
  mkdirSync(join(dir, "graders"));
  writeFileSync(join(dir, "case.yaml"), "name: example\ncontext:\n  scaffold_script: stage-inputs.sh\nexpected_outcome: |\n  It works.\n");
  writeFileSync(join(dir, "prompt.md"), "---\ntags: [rust-config]\nmax_turns: 3\ntimeout_seconds: 60\nallowed_tools: [Read, Edit]\n---\nDo it.\n");
  writeFileSync(join(dir, "stage-inputs.sh"), "cp -R \"$(dirname \"$0\")/inputs/.\" .\n");
  writeFileSync(join(dir, "graders", "01.md"), "Check it.\n");
  writeFileSync(join(dir, "change.diff"), "one\n");
  const [first] = discover(root);
  assert.deepEqual(first.allowedTools, ["Read", "Edit"]);
  assert.deepEqual(first.tags, ["rust-config"]);
  assert.equal(expectedOutcome(first.metadata), "It works.");
  writeFileSync(join(dir, "change.diff"), "two\n");
  assert.notEqual(discover(root)[0].fixtureHash, first.fixtureHash);
  mkdirSync(join(dir, "results"));
  writeFileSync(join(dir, "results", "out.json"), "{}");
  assert.equal(discover(root)[0].name, "example");
});

test("claude argv passes the case tool allowlist and keeps the prompt off argv", () => {
  const argv = buildArgv("claude", { model: "m", turns: 7, allowedTools: ["Read", "Edit", "Bash"] });
  assert.deepEqual(argv.slice(argv.indexOf("--allowedTools"), argv.indexOf("--allowedTools") + 2), [
    "--allowedTools", "Read,Edit,Bash",
  ]);
  assert.ok(argv.includes("--strict-mcp-config"));
  assert.equal(argv[argv.indexOf("--setting-sources") + 1], "project,local");
  assert.equal(argv[argv.indexOf("--max-turns") + 1], "7");
  assert.equal(buildArgv("codex", { model: "m", turns: 7, allowedTools: [] }).at(-1), "-");
});

test("claude events yield usage, denials, activations and visible skills", () => {
  const parsed = parseClaudeEvents(jsonl(
    { type: "system", subtype: "init", skills: ["rust-config", "other:thing"], plugins: [{ name: "p", source: "p@m" }] },
    { type: "assistant", message: { content: [
      { type: "tool_use", name: "Skill", input: { skill: "rewrite-rs-skills:rust-config" } },
      { type: "tool_use", name: "Read", input: { file_path: "/w/.claude/skills/rust-errors/SKILL.md" } },
      { type: "tool_use", name: "Edit", input: {} },
    ] } },
    { type: "result", subtype: "success", is_error: false, usage: { input_tokens: 3 }, total_cost_usd: 0.5,
      num_turns: 2, permission_denials: [{ tool_name: "Bash" }] },
  ));
  assert.equal(parsed.recognized, true);
  assert.equal(parsed.isError, false);
  assert.equal(parsed.toolCalls, 3);
  assert.deepEqual(parsed.toolCallsByName, { Skill: 1, Read: 1, Edit: 1 });
  assert.deepEqual(parsed.skillActivations, ["rust-config", "rust-errors"]);
  assert.deepEqual(parsed.permissionDenials, ["Bash"]);
  assert.deepEqual(parsed.visibleSkills, ["rust-config", "other:thing"]);
  assert.deepEqual(parsed.visiblePlugins, ["p@m"]);
  assert.equal(parsed.costUsd, 0.5);
  assert.equal(parseClaudeEvents(jsonl({ type: "result", subtype: "error_max_turns" })).isError, true);
  assert.equal(parseClaudeEvents("not json").recognized, false);
});

test("codex events count file changes and observed skill reads", () => {
  const parsed = parseCodexEvents(jsonl(
    { type: "item.started", item: { type: "command_execution", command: "cat x" } },
    { type: "item.completed", item: { type: "command_execution", command: "sed -n 1,80p .agents/skills/rust-config/SKILL.md" } },
    { type: "item.completed", item: { type: "file_change", changes: [] } },
    { type: "item.completed", item: { type: "agent_message", text: "done" } },
    { type: "turn.completed", usage: { input_tokens: 4, output_tokens: 1 } },
  ));
  assert.equal(parsed.toolCalls, 2);
  assert.deepEqual(parsed.toolCallsByName, { command_execution: 1, file_change: 1 });
  assert.deepEqual(parsed.skillActivations, ["rust-config"]);
  assert.deepEqual(parsed.usage, { input_tokens: 4, output_tokens: 1 });
  assert.equal(parsed.isError, false);
  assert.equal(parseCodexEvents(jsonl({ type: "turn.failed", error: {} })).isError, true);
});

test("codex prompt catalog parsing and visibility checks", () => {
  const output = JSON.stringify("x\n- rewrite-rs-skills:rust-config: Configure. (file: r1/rust-config/SKILL.md)\n"
    + "- skill-installer: Install. (file: r0/skill-installer/SKILL.md)\nnot a skill\n");
  const visible = parseCodexPromptSkills(output);
  assert.deepEqual(visible, ["rewrite-rs-skills:rust-config", "skill-installer"]);
  const catalog = { repoSkills: ["rust-config", "rust-skills-map"], modelInvoked: ["rust-config"] };
  assert.deepEqual(checkVisibility("skills", visible, catalog), { checked: true, ok: true, problems: [] });
  assert.equal(checkVisibility("baseline", visible, catalog).ok, false);
  assert.equal(checkVisibility("baseline", ["skill-installer"], catalog).ok, true);
  assert.equal(checkVisibility("skills", ["skill-installer"], catalog).ok, false);
  assert.equal(checkVisibility("skills", null, catalog).checked, false);
});

test("judge prompts are arm-blind and judge output is parsed strictly", () => {
  const [evalCase] = discover(new URL("../evals/rust/rust-config/", import.meta.url).pathname);
  const prompt = buildJudgePrompt(evalCase, "change.diff");
  assert.match(prompt, /Expected outcome/);
  assert.doesNotMatch(prompt, /baseline|skills arm/i);
  const parsed = extractJudgeGrade("Notes.\n```json\n" + JSON.stringify(grade("x")) + "\n```\n");
  assert.equal(score(parsed), 100);
  assert.throws(() => extractJudgeGrade("no grade here"));
});

test("every case targets promoted skills and every specialized skill has a case", () => {
  const promoted = new Set(collectSkills(new URL("../", import.meta.url).pathname)
    .filter((skill) => skill.promoted).map((skill) => skill.directory));
  const cases = discover(new URL("../evals/", import.meta.url).pathname);
  for (const evalCase of cases) {
    for (const tag of evalCase.tags) assert.ok(promoted.has(tag), `${evalCase.name} tags unknown skill ${tag}`);
  }
  const covered = new Set(cases.flatMap((evalCase) => evalCase.tags));
  const specialized = [
    "rust-api-development", "rust-database", "rust-resilience", "rust-production-readiness",
    "rust-workspace-management", "rust-cross-platform", "rust-cli-development", "rust-memory-profiling",
    "rust-distributed-systems",
  ];
  assert.deepEqual(specialized.filter((name) => !covered.has(name)), []);
});

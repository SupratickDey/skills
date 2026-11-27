// End-to-end runner tests against stand-in `claude` and `codex` executables.
// They exercise staging, isolation, argv, trace parsing, judging and reports
// without credentials or network access.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../", import.meta.url));

// The stand-in agent reports what it received on stderr, reports the skills it
// can see the way each real CLI does, edits a file and emits a trace.
const FAKE_AGENT = String.raw`#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const agent = path.basename(process.argv[1]);
const argv = process.argv.slice(2);
if (argv[0] === "--version") { console.log(agent + " 0.0.0-fake"); process.exit(0); }
const skillsDir = agent === "claude" ? ".claude/skills" : ".agents/skills";
const skills = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir) : [];
const extra = (process.env.FAKE_EXTRA_SKILLS || "").split(",").filter(Boolean);
if (agent === "codex" && argv[0] === "debug") {
  const lines = [...skills, ...extra].map((name) => "- " + name + ": Does it. (file: r1/" + name + "/SKILL.md)");
  console.log(JSON.stringify(lines.join("\n")));
  process.exit(0);
}
const prompt = fs.readFileSync(0, "utf8");
const judging = argv.includes("json") || argv.includes("--output-last-message");
process.stderr.write(JSON.stringify({ argv, cwd: process.cwd(), prompt: prompt.slice(0, 80), files: fs.readdirSync(".") }) + "\n");
if (judging) {
  const grade = { critical: false, evidence: "Read the diff and ran tests", scores: {
    correctness: 1, maintainability: 0.5, regression: 1, security: 1, scope: 1, evidence: 1 } };
  const fence = String.fromCharCode(96).repeat(3);
  const message = "Graded.\n" + fence + "json\n" + JSON.stringify(grade) + "\n" + fence + "\n";
  if (agent === "codex") fs.writeFileSync(argv[argv.indexOf("--output-last-message") + 1], message);
  else console.log(JSON.stringify({ type: "result", subtype: "success", is_error: false, result: message }));
  process.exit(0);
}
fs.writeFileSync("REVIEW.md", "Review by " + agent + "\n");
const target = skills.includes("rust-code-review") ? "rust-code-review" : null;
const emit = (event) => console.log(JSON.stringify(event));
if (agent === "claude") {
  emit({ type: "system", subtype: "init", skills: [...skills, ...extra], plugins: [] });
  const content = [{ type: "tool_use", name: "Write", input: { file_path: "REVIEW.md" } }];
  if (target) content.push({ type: "tool_use", name: "Skill", input: { skill: target } });
  emit({ type: "assistant", message: { content } });
  emit({ type: "result", subtype: "success", is_error: false, usage: { input_tokens: 10, output_tokens: 2 },
    total_cost_usd: 0.01, num_turns: 1, permission_denials: [] });
} else {
  emit({ type: "item.completed", item: { type: "file_change", changes: [] } });
  if (target) emit({ type: "item.completed", item: { type: "command_execution", command: "cat .agents/skills/" + target + "/SKILL.md" } });
  emit({ type: "turn.completed", usage: { input_tokens: 5, output_tokens: 1 } });
}
`;

function makeSandbox(t) {
  const base = mkdtempSync(join(tmpdir(), "evaluate-test-"));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const copy = join(base, "repo");
  const skip = new Set(["node_modules", "target", ".git"]);
  cpSync(repo, copy, {
    recursive: true,
    filter: (source) => !skip.has(relative(repo, source).split(/[\\/]/)[0]),
  });
  const git = (...argv) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@invalid",
    "-c", "commit.gpgsign=false", ...argv], { cwd: copy, encoding: "utf8" });
  git("init", "--quiet");
  git("add", "-A");
  git("commit", "--quiet", "-m", "snapshot");
  const bin = join(base, "bin");
  mkdirSync(bin);
  for (const name of ["claude", "codex"]) {
    writeFileSync(join(bin, name), FAKE_AGENT);
    chmodSync(join(bin, name), 0o755);
  }
  const run = (argv, env = {}) => spawnSync(process.execPath, [join(copy, "scripts", "evaluate.mjs"), ...argv], {
    cwd: copy,
    encoding: "utf8",
    env: { ...process.env, ...env, PATH: bin + delimiter + process.env.PATH },
  });
  return { copy, run };
}

const skipOnWindows = { skip: process.platform === "win32" ? "stand-in agents are POSIX scripts" : false };

for (const agent of ["claude", "codex"]) {
  test(`${agent}: runs both arms in isolated, fully scaffolded workspaces`, skipOnWindows, (t) => {
    const { copy, run } = makeSandbox(t);
    const result = run(["run", "--agent", agent, "--model", "m", "--case", "review-config-diff",
      "--isolated-environment-confirmed"]);
    assert.equal(result.status, 0, result.stderr);
    const out = result.stdout.trim();
    const records = JSON.parse(readFileSync(join(out, "runs.json"), "utf8"));
    assert.deepEqual(records.map((r) => [r.arm, r.status]), [["baseline", "completed"], ["skills", "completed"]]);

    for (const record of records) {
      const runDir = join(out, record.id);
      const seen = JSON.parse(readFileSync(join(runDir, "stderr.txt"), "utf8").trim());
      // The workspace lives outside the repository, so no repo instructions leak in.
      assert.ok(relative(copy, seen.cwd).startsWith(".."), seen.cwd);
      // The scaffold ran: change.diff exists and was applied.
      assert.ok(seen.files.includes("change.diff"), seen.files.join(","));
      assert.match(seen.prompt, /^Review this change/);
      assert.ok(!seen.argv.some((arg) => arg.startsWith("Review this change")), "prompt must go on stdin");
      if (agent === "claude") {
        assert.equal(seen.argv[seen.argv.indexOf("--allowedTools") + 1], "Read,Grep,Glob,Skill,Bash,Write,Edit");
      }
      assert.ok(existsSync(join(runDir, "workspace-final", "change.diff")));
      assert.equal(existsSync(join(runDir, "workspace-final", agent === "claude" ? ".claude" : ".agents")), false);
      const diff = readFileSync(join(runDir, "workspace.diff"), "utf8");
      assert.match(diff, /REVIEW\.md/);
      assert.doesNotMatch(diff, /SKILL\.md/);
      assert.equal(record.visibilityChecked, true);
      assert.deepEqual(record.expectedSkills, ["rust-code-review"]);
    }
    const [baseline, skills] = records;
    assert.equal(baseline.visibleSkillCount, 0);
    assert.equal(skills.visibleSkillCount, 43);
    assert.deepEqual(baseline.skillActivations, []);
    assert.deepEqual(skills.skillActivations, ["rust-code-review"]);
    assert.equal(skills.toolCalls, 2);

    const judged = run(["judge", "--runs", join(out, "runs.json"), "--judge-agent", agent, "--judge-model", "j",
      "--isolated-environment-confirmed"]);
    assert.equal(judged.status, 0, judged.stderr);
    const grades = JSON.parse(readFileSync(judged.stdout.trim(), "utf8"));
    assert.equal(grades.length, 2);
    assert.equal(grades[0].judge.agent, agent);

    const report = run(["report", "--runs", join(out, "runs.json"), "--grades", judged.stdout.trim()]);
    assert.equal(report.status, 0, report.stderr);
    const { summary } = JSON.parse(report.stdout);
    assert.equal(summary[0].matchedScoredPairs, 1);
    assert.equal(summary[0].meanDelta, 0);
    assert.deepEqual(summary[0].skills.targetActivation, { activated: 1, of: 1, rate: 1 });
  });
}

test("a baseline that can see repository skills is invalid, not scored", skipOnWindows, (t) => {
  const { run } = makeSandbox(t);
  const result = run(["run", "--agent", "codex", "--model", "m", "--case", "config-worker-count",
    "--isolated-environment-confirmed"], { FAKE_EXTRA_SKILLS: "rewrite-rs-skills:rust-config" });
  assert.equal(result.status, 0, result.stderr);
  const [baseline] = JSON.parse(readFileSync(join(result.stdout.trim(), "runs.json"), "utf8"));
  assert.equal(baseline.status, "invalid");
  assert.match(baseline.statusReason, /baseline exposes repository skills: rust-config/);
});

test("run refuses without the isolation confirmation or on a dirty checkout", skipOnWindows, (t) => {
  const { copy, run } = makeSandbox(t);
  assert.notEqual(run(["run", "--agent", "claude", "--model", "m", "--case", "config-worker-count"]).status, 0);
  writeFileSync(join(copy, "untracked.txt"), "x");
  const dirty = run(["run", "--agent", "claude", "--model", "m", "--case", "config-worker-count",
    "--isolated-environment-confirmed"]);
  assert.notEqual(dirty.status, 0);
  assert.match(dirty.stderr, /clean committed checkout/);
});

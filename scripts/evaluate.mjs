import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { discover, stage, digest, summarize } from "./eval-core.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const cases = discover(join(root, "evals"));
const manifest = JSON.parse(readFileSync(join(root, ".claude-plugin/plugin.json"), "utf8"));
const [command, ...args] = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
};
function run(cmd, argv, opts = {}) {
  return spawnSync(cmd, argv, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...opts });
}
function hashInputs(dir) {
  const parts = [];
  function walk(path, prefix = "") {
    for (const e of readdirSync(path, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      const name = prefix + e.name;
      if (e.isDirectory()) walk(join(path, e.name), name + "/");
      else if (e.isFile()) parts.push([name, digest(readFileSync(join(path, e.name)))]);
      else throw Error("Unsupported fixture entry");
    }
  }
  walk(dir);
  return digest(JSON.stringify(parts));
}
function parseEvents(agent, output) {
  let usage = null, calls = 0, recognized = false;
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (agent === "codex" && event.type === "turn.completed") {
      usage = event.usage ?? null; recognized = true;
    }
    if (agent === "codex" && event.type === "item.started" && ["command_execution", "mcp_tool_call"].includes(event.item?.type)) calls++;
    if (agent === "claude" && event.type === "result") { usage = event.usage ?? null; recognized = true; }
    if (agent === "claude" && event.type === "assistant") {
      for (const item of event.message?.content ?? []) if (item.type === "tool_use") calls++;
    }
  }
  return { usage, observedToolCalls: recognized ? calls : null };
}
if (command === "list") {
  console.log(JSON.stringify(cases.map(({ name, turns, timeout, graders }) => ({ name, turns, timeout, graders: graders.length })), null, 2));
} else if (command === "run") {
  if (!args.includes("--isolated-environment-confirmed")) throw Error("Run only in a disposable, externally isolated environment with approved credentials and no other installed skills. Confirm with --isolated-environment-confirmed.");
  const agent = option("--agent"), model = option("--model"), name = option("--case");
  const trials = Number(option("--trials") ?? 1);
  if (!["claude", "codex"].includes(agent) || !model || !name || !Number.isSafeInteger(trials) || trials < 1 || trials > 10) throw Error("Specify --agent claude|codex --model MODEL --case NAME [--trials 1..10]");
  const c = cases.find(x => x.name === name);
  if (!c) throw Error("Unknown case");
  const revision = run("git", ["rev-parse", "HEAD"], { cwd: root });
  const dirty = run("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: root });
  if (revision.status !== 0 || dirty.status !== 0 || dirty.stdout.trim()) throw Error("Use a clean committed checkout");
  const version = run(agent, ["--version"]);
  if (version.status !== 0) throw Error("Agent CLI unavailable: " + agent);
  const outRoot = resolve(root, "target", "agent-evals");
  mkdirSync(outRoot, { recursive: true });
  const out = mkdtempSync(join(outRoot, agent + "-"));
  const fixtureHash = digest(JSON.stringify([hashInputs(join(c.dir, "inputs")), c.metadata, c.prompt, c.graders]));
  const records = [];
  for (let trial = 1; trial <= trials; trial++) {
    for (const arm of trial % 2 ? ["baseline", "skills"] : ["skills", "baseline"]) {
      const id = agent + "-" + c.name + "-" + trial + "-" + arm;
      const dir = join(out, id);
      mkdirSync(dir);
      const work = join(dir, "workspace");
      stage(join(c.dir, "inputs"), work);
      if (arm === "skills") {
        const target = join(work, agent === "claude" ? ".claude" : ".agents", "skills");
        mkdirSync(target, { recursive: true });
        for (const path of manifest.skills) {
          if (!/^\.\/skills\/(rust|porting|workflow|misc)\/[a-z0-9-]+$/.test(path)) throw Error("Invalid skill path");
          stage(join(root, path), join(target, path.split("/").at(-1)));
        }
      }
      const argv = agent === "claude"
        ? ["-p", "--model", model, "--output-format", "stream-json", "--verbose", "--max-turns", String(c.turns), c.prompt]
        : ["exec", "--json", "--model", model, "--sandbox", "workspace-write", "--skip-git-repo-check", c.prompt];
      const started = performance.now();
      const result = run(agent, argv, { cwd: work, timeout: c.timeout * 1000 });
      const elapsedMs = Math.round(performance.now() - started);
      const stdout = result.stdout ?? "", stderr = result.stderr ?? "";
      writeFileSync(join(dir, "stdout.jsonl"), stdout, { mode: 0o600 });
      writeFileSync(join(dir, "stderr.txt"), stderr, { mode: 0o600 });
      const status = result.error?.code === "ETIMEDOUT" ? "timeout" : result.error ? "blocked" : result.status === 0 ? "completed" : "failed";
      records.push({ id, agent, case: c.name, trial, arm, model, version: version.stdout.trim(), revision: revision.stdout.trim(), fixtureHash, status, elapsedMs, exitCode: result.status, ...parseEvents(agent, stdout) });
      writeFileSync(join(out, "runs.json"), JSON.stringify(records, null, 2), { mode: 0o600 });
    }
  }
  writeFileSync(join(out, "rubric.json"), JSON.stringify({ case: c.name, expected: c.metadata, graders: c.graders }, null, 2));
  console.log(out);
} else if (command === "report") {
  const runs = option("--runs"), grades = option("--grades");
  if (!runs || !grades) throw Error("Specify --runs FILE --grades FILE");
  console.log(JSON.stringify(summarize(JSON.parse(readFileSync(runs, "utf8")), JSON.parse(readFileSync(grades, "utf8"))), null, 2));
} else {
  throw Error("Usage: evaluate.mjs list|run|report");
}

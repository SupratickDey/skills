// Paired baseline/skills evaluation runner for Claude Code and Codex CLI.
// See docs/evaluation.md for the isolation contract and grading workflow.
import {
  closeSync, cpSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  AGENTS, aggregate, buildArgv, buildJudgeArgv, buildJudgePrompt, checkVisibility, discover, extractJudgeGrade,
  parseClaudeEvents, parseCodexEvents, parseCodexPromptSkills, score, stage, summarize,
} from "./eval-core.mjs";
import { collectSkills } from "./check-skills.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const SCAFFOLD_TIMEOUT_MS = 120_000;
const KILL_GRACE_MS = 10_000;
const GIT_IDENTITY = [
  "-c", "user.name=eval-fixture", "-c", "user.email=eval-fixture@invalid", "-c", "commit.gpgsign=false",
];

const [command, ...args] = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) throw Error(`${name} requires a value`);
  return value;
}

function runSync(cmd, argv, options = {}) {
  return spawnSync(cmd, argv, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...options });
}

function git(cwd, argv) {
  const result = runSync("git", [...GIT_IDENTITY, ...argv], { cwd });
  if (result.status !== 0) throw Error(`git ${argv.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
}

// Runs an agent with the prompt on stdin, streaming output straight to files.
// On timeout the whole process group is stopped, not only the direct child.
function runAgent(cmd, argv, { cwd, input, timeoutMs, stdoutPath, stderrPath }) {
  return new Promise((resolvePromise) => {
    const out = openSync(stdoutPath, "w", 0o600);
    const err = openSync(stderrPath, "w", 0o600);
    const posix = process.platform !== "win32";
    const started = performance.now();
    let timedOut = false;
    let child;
    try {
      child = spawn(cmd, argv, { cwd, stdio: ["pipe", out, err], detached: posix });
    } catch (error) {
      closeSync(out);
      closeSync(err);
      resolvePromise({ error, status: null, timedOut, elapsedMs: 0 });
      return;
    }
    const stop = (signal) => {
      try {
        if (posix) process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch {
        // The process group has already exited.
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      stop("SIGTERM");
      setTimeout(() => stop("SIGKILL"), KILL_GRACE_MS).unref();
    }, timeoutMs);
    let spawnError = null;
    child.on("error", (error) => {
      spawnError = error;
    });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
    child.on("close", (status) => {
      clearTimeout(timer);
      if (posix) stop("SIGKILL"); // reap descendants left behind by a clean exit
      closeSync(out);
      closeSync(err);
      resolvePromise({ error: spawnError, status, timedOut, elapsedMs: Math.round(performance.now() - started) });
    });
  });
}

function requireIsolationConfirmed() {
  if (!args.includes("--isolated-environment-confirmed")) {
    throw Error(
      "Run only in a disposable, externally isolated environment with approved credentials and no other " +
      "installed skills or plugins. Confirm with --isolated-environment-confirmed."
    );
  }
}

function requireAgentVersion(agent) {
  const version = runSync(agent, ["--version"]);
  if (version.status !== 0) throw Error("Agent CLI unavailable: " + agent);
  return version.stdout.trim();
}

function skillCatalog() {
  const manifest = JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8"));
  const promoted = new Map(collectSkills(root).filter((skill) => skill.promoted).map((s) => [s.directory, s]));
  const paths = manifest.skills.map((path) => {
    if (!/^\.\/skills\/(rust|porting|workflow|misc)\/[a-z0-9-]+$/.test(path)) throw Error("Invalid skill path: " + path);
    return path;
  });
  const repoSkills = paths.map((path) => path.split("/").at(-1));
  const modelInvoked = repoSkills.filter((name) => !promoted.get(name)?.userInvoked);
  return { paths, repoSkills, modelInvoked };
}

// Builds the starting workspace: the case's own scaffold script (committed in
// this checkout) runs in an empty directory outside the repository, so the
// agent cannot inherit this repo's AGENTS.md, CLAUDE.md or skills.
function prepareWorkspace(evalCase, arm, agent, catalog) {
  const workRoot = mkdtempSync(join(tmpdir(), "rewrite-rs-eval-"));
  const work = join(workRoot, "workspace");
  mkdirSync(work);
  const scaffold = runSync("bash", [join(evalCase.dir, evalCase.scaffold)], {
    cwd: work,
    timeout: SCAFFOLD_TIMEOUT_MS,
  });
  if (scaffold.status !== 0) {
    throw Error(`Scaffold failed for ${evalCase.name}: ${scaffold.stderr || scaffold.error?.message}`);
  }
  const skillsDir = agent === "claude" ? join(".claude", "skills") : join(".agents", "skills");
  if (arm === "skills") {
    mkdirSync(join(work, skillsDir), { recursive: true });
    for (const path of catalog.paths) stage(join(root, path), join(work, skillsDir, path.split("/").at(-1)));
  }
  // A committed starting point lets the run's change be captured as a diff.
  git(work, ["init", "--quiet"]);
  writeFileSync(join(work, ".git", "info", "exclude"), "target/\n");
  git(work, ["add", "-A"]);
  git(work, ["commit", "--quiet", "--allow-empty", "-m", "fixture"]);
  return { workRoot, work, skillsDir };
}

function captureWorkspace(work, skillsDir, runDir) {
  git(work, ["add", "-A"]);
  writeFileSync(join(runDir, "workspace.diff"), git(work, ["diff", "--cached", "--binary", "HEAD"]), { mode: 0o600 });
  const injected = skillsDir.split(/[\\/]/)[0];
  cpSync(work, join(runDir, "workspace-final"), {
    recursive: true,
    filter: (source) => {
      const rel = relative(work, source).split(/[\\/]/)[0];
      return rel !== ".git" && rel !== "target" && rel !== injected;
    },
  });
}

function probeCodexSkills(work) {
  const probe = runSync("codex", ["debug", "prompt-input", "visibility probe"], { cwd: work, timeout: 120_000 });
  return probe.status === 0 ? parseCodexPromptSkills(probe.stdout) : null;
}

function classify(result, events, visibility) {
  if (visibility.checked && !visibility.ok) return { status: "invalid", reason: visibility.problems.join("; ") };
  if (result.timedOut) return { status: "timeout", reason: "timeout" };
  if (result.error) return { status: "blocked", reason: result.error.message };
  if (result.status !== 0) return { status: "failed", reason: "exit " + result.status };
  if (events.isError) return { status: "failed", reason: "agent reported an error result" };
  return { status: "completed", reason: null };
}

async function runCommand() {
  requireIsolationConfirmed();
  const agent = option("--agent");
  const model = option("--model");
  const caseName = option("--case");
  const trials = Number(option("--trials") ?? 1);
  if (!AGENTS.includes(agent) || !model || !caseName || !Number.isSafeInteger(trials) || trials < 1 || trials > 10) {
    throw Error("Specify --agent claude|codex --model MODEL --case NAME [--trials 1..10]");
  }
  const keepWorkspaces = args.includes("--keep-workspaces");
  const evalCase = discover(join(root, "evals")).find((c) => c.name === caseName);
  if (!evalCase) throw Error("Unknown case: " + caseName);

  const revision = runSync("git", ["rev-parse", "HEAD"], { cwd: root });
  const dirty = runSync("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: root });
  if (revision.status !== 0 || dirty.status !== 0 || dirty.stdout.trim()) throw Error("Use a clean committed checkout");
  const version = requireAgentVersion(agent);
  const catalog = skillCatalog();
  const expectedSkills = evalCase.tags.filter((tag) => catalog.repoSkills.includes(tag));

  const outRoot = resolve(root, "target", "agent-evals");
  mkdirSync(outRoot, { recursive: true });
  const out = mkdtempSync(join(outRoot, agent + "-"));
  const records = [];
  for (let trial = 1; trial <= trials; trial++) {
    // Alternate arm order so neither arm always runs first.
    const order = trial % 2 === 1 ? ["baseline", "skills"] : ["skills", "baseline"];
    for (const arm of order) {
      const id = `${agent}-${evalCase.name}-${trial}-${arm}`;
      const runDir = join(out, id);
      mkdirSync(runDir);
      const { workRoot, work, skillsDir } = prepareWorkspace(evalCase, arm, agent, catalog);
      const codexVisible = agent === "codex" ? probeCodexSkills(work) : null;
      const argv = buildArgv(agent, { model, turns: evalCase.turns, allowedTools: evalCase.allowedTools });
      const result = await runAgent(agent, argv, {
        cwd: work,
        input: evalCase.prompt,
        timeoutMs: evalCase.timeout * 1000,
        stdoutPath: join(runDir, "stdout.jsonl"),
        stderrPath: join(runDir, "stderr.txt"),
      });
      const stdout = readFileSync(join(runDir, "stdout.jsonl"), "utf8");
      const events = agent === "claude" ? parseClaudeEvents(stdout) : parseCodexEvents(stdout);
      const visibleSkills = agent === "claude" ? events.visibleSkills : codexVisible;
      const visibility = checkVisibility(arm, visibleSkills, catalog);
      const { status, reason } = classify(result, events, visibility);
      captureWorkspace(work, skillsDir, runDir);
      if (keepWorkspaces) writeFileSync(join(runDir, "workspace-path.txt"), work + "\n");
      else rmSync(workRoot, { recursive: true, force: true });

      records.push({
        id, agent, case: evalCase.name, trial, arm, model, version,
        revision: revision.stdout.trim(), fixtureHash: evalCase.fixtureHash, expectedSkills,
        status, statusReason: reason, elapsedMs: result.elapsedMs, exitCode: result.status,
        usage: events.recognized ? events.usage : null,
        costUsd: events.costUsd, numTurns: events.numTurns,
        toolCalls: events.recognized ? events.toolCalls : null,
        toolCallsByName: events.recognized ? events.toolCallsByName : null,
        permissionDenials: events.permissionDenials,
        skillActivations: events.recognized ? events.skillActivations : null,
        visibilityChecked: visibility.checked,
        visibleSkillCount: Array.isArray(visibleSkills) ? visibleSkills.length : null,
        visiblePlugins: events.visiblePlugins,
      });
      writeFileSync(join(out, "runs.json"), JSON.stringify(records, null, 2), { mode: 0o600 });
    }
  }
  writeFileSync(join(out, "rubric.json"), JSON.stringify({
    case: evalCase.name, expected: evalCase.metadata, graders: evalCase.graders,
  }, null, 2));
  console.log(out);
}

function judgeOutputText(agent, stdout, lastMessageFile) {
  if (agent === "codex") return existsSync(lastMessageFile) ? readFileSync(lastMessageFile, "utf8") : "";
  const parsed = JSON.parse(stdout);
  if (parsed.is_error) throw Error("Judge reported an error result");
  return String(parsed.result ?? "");
}

async function judgeCommand() {
  requireIsolationConfirmed();
  const runsPath = option("--runs");
  const judgeAgent = option("--judge-agent");
  const judgeModel = option("--judge-model");
  if (!runsPath || !AGENTS.includes(judgeAgent) || !judgeModel) {
    throw Error("Specify --runs FILE --judge-agent claude|codex --judge-model MODEL [--out FILE]");
  }
  const outPath = resolve(option("--out") ?? join(dirname(runsPath), "grades.auto.json"));
  const judgeVersion = requireAgentVersion(judgeAgent);
  const cases = new Map(discover(join(root, "evals")).map((c) => [c.name, c]));
  const records = JSON.parse(readFileSync(runsPath, "utf8"));
  const grades = [];
  const errors = [];
  for (const record of records) {
    if (record.status !== "completed") continue;
    const evalCase = cases.get(record.case);
    const runDir = join(dirname(resolve(runsPath)), record.id);
    if (!evalCase || evalCase.fixtureHash !== record.fixtureHash) {
      errors.push({ id: record.id, error: "case changed since the run; regrade from the matching revision" });
      continue;
    }
    const judgeRoot = mkdtempSync(join(tmpdir(), "rewrite-rs-judge-"));
    const work = join(judgeRoot, "workspace");
    cpSync(join(runDir, "workspace-final"), work, { recursive: true });
    const diffPath = ".eval-agent-change.diff";
    cpSync(join(runDir, "workspace.diff"), join(work, diffPath));
    const lastMessageFile = join(judgeRoot, "last-message.txt");
    const result = await runAgent(judgeAgent, buildJudgeArgv(judgeAgent, { model: judgeModel, lastMessageFile }), {
      cwd: work,
      input: buildJudgePrompt(evalCase, diffPath),
      timeoutMs: evalCase.timeout * 1000,
      stdoutPath: join(runDir, "judge-stdout.txt"),
      stderrPath: join(runDir, "judge-stderr.txt"),
    });
    try {
      if (result.timedOut || result.error || result.status !== 0) throw Error("judge run did not complete");
      const text = judgeOutputText(judgeAgent, readFileSync(join(runDir, "judge-stdout.txt"), "utf8"), lastMessageFile);
      const grade = { id: record.id, ...extractJudgeGrade(text) };
      score(grade); // rejects a malformed grade instead of recording it
      grades.push({ ...grade, judge: { agent: judgeAgent, model: judgeModel, version: judgeVersion } });
    } catch (error) {
      errors.push({ id: record.id, error: error.message });
    } finally {
      rmSync(judgeRoot, { recursive: true, force: true });
    }
  }
  writeFileSync(outPath, JSON.stringify(grades, null, 2), { mode: 0o600 });
  if (errors.length > 0) {
    writeFileSync(outPath.replace(/\.json$/, "") + ".errors.json", JSON.stringify(errors, null, 2), { mode: 0o600 });
    console.error(`${errors.length} run(s) could not be graded; see the .errors.json file. They have no score.`);
  }
  console.log(outPath);
}

function reportCommand() {
  const runs = option("--runs");
  const gradeFiles = args.flatMap((arg, index) => (arg === "--grades" ? [args[index + 1]] : []));
  if (!runs || gradeFiles.length === 0 || gradeFiles.some((file) => !file || file.startsWith("--"))) {
    throw Error("Specify --runs FILE --grades FILE [--grades FILE ...]");
  }
  const grades = gradeFiles.flatMap((file) => JSON.parse(readFileSync(file, "utf8")));
  const pairs = summarize(JSON.parse(readFileSync(runs, "utf8")), grades);
  console.log(JSON.stringify({ summary: aggregate(pairs), pairs }, null, 2));
}

function listCommand() {
  const cases = discover(join(root, "evals"));
  console.log(JSON.stringify(cases.map(({ name, tags, turns, timeout, graders, allowedTools }) => ({
    name, tags, turns, timeout, graders: graders.length, allowedTools,
  })), null, 2));
}

if (command === "list") listCommand();
else if (command === "run") await runCommand();
else if (command === "judge") await judgeCommand();
else if (command === "report") reportCommand();
else throw Error("Usage: evaluate.mjs list|run|judge|report");

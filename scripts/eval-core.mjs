// Pure evaluation logic shared by scripts/evaluate.mjs and its tests: case
// discovery, staging, agent argv, scoring, aggregation and judging. Nothing
// here spawns an agent or touches the network. Trace parsing lives in
// eval-traces.mjs and is re-exported here.
import { readdirSync, readFileSync, lstatSync, existsSync, cpSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

export {
  bareSkillName, checkVisibility, parseClaudeEvents, parseCodexEvents, parseCodexPromptSkills,
} from "./eval-traces.mjs";

export const weights = Object.freeze({
  correctness: 30,
  maintainability: 20,
  regression: 15,
  security: 15,
  scope: 10,
  evidence: 10,
});

export const AGENTS = Object.freeze(["claude", "codex"]);
export const ARMS = Object.freeze(["baseline", "skills"]);
export const STATUSES = Object.freeze(["completed", "failed", "blocked", "timeout", "invalid"]);

export const digest = (data) => createHash("sha256").update(data).digest("hex");

function sortedEntries(dir) {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
}

// Hashes every regular file under dir by relative path and content. Links and
// special files are rejected, so a fixture cannot reach outside its directory.
// Names in `exclude` are skipped at the top level only.
export function hashTree(dir, { exclude = [] } = {}) {
  const parts = [];
  function walk(path, prefix) {
    for (const entry of sortedEntries(path)) {
      if (prefix === "" && exclude.includes(entry.name)) continue;
      const rel = prefix + entry.name;
      if (entry.isDirectory()) walk(join(path, entry.name), rel + "/");
      else if (entry.isFile()) parts.push([rel, digest(readFileSync(join(path, entry.name)))]);
      else throw Error("Unsupported fixture entry: " + rel);
    }
  }
  walk(dir, "");
  return digest(JSON.stringify(parts));
}

function frontmatterList(front, key) {
  const match = new RegExp(`^${key}:\\s*\\[([^\\]]*)\\]\\s*$`, "m").exec(front);
  if (!match) return [];
  return match[1].split(",").map((item) => item.trim()).filter(Boolean);
}

function frontmatterInteger(front, key) {
  const match = new RegExp(`^${key}:\\s*(\\d+)\\s*$`, "m").exec(front);
  return match ? Number(match[1]) : NaN;
}

export function parseCase(dir) {
  const metadata = readFileSync(join(dir, "case.yaml"), "utf8");
  const name = /^name:\s*([a-z0-9-]+)\s*$/m.exec(metadata)?.[1];
  const scaffold = /^\s+scaffold_script:\s*(\S+)\s*$/m.exec(metadata)?.[1];
  const promptFile = readFileSync(join(dir, "prompt.md"), "utf8");
  const front = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(promptFile);
  if (!name || !front) throw Error("Unsupported case (name or prompt frontmatter): " + dir);

  const timeout = frontmatterInteger(front[1], "timeout_seconds");
  const turns = frontmatterInteger(front[1], "max_turns");
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 3600) {
    throw Error("Unsupported case (timeout_seconds): " + dir);
  }
  if (!Number.isSafeInteger(turns) || turns < 1) throw Error("Unsupported case (max_turns): " + dir);
  // The scaffold is part of the fixture: review-config-diff, for example,
  // applies change.diff on top of inputs/. Only a script inside the case
  // directory with a plain file name is accepted.
  if (!scaffold || !/^[A-Za-z0-9._-]+\.sh$/.test(scaffold) || !lstatSync(join(dir, scaffold)).isFile()) {
    throw Error("Unsupported case (scaffold_script): " + dir);
  }
  if (!lstatSync(join(dir, "inputs")).isDirectory()) throw Error("Unsupported case (inputs): " + dir);

  const graders = sortedEntries(join(dir, "graders"))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => ({ name: entry.name, text: readFileSync(join(dir, "graders", entry.name), "utf8") }));
  if (graders.length === 0) throw Error("No graders: " + name);

  return {
    name,
    dir,
    metadata,
    prompt: front[2].trim(),
    timeout,
    turns,
    scaffold,
    tags: frontmatterList(front[1], "tags"),
    allowedTools: frontmatterList(front[1], "allowed_tools"),
    graders,
    // results/ is where `claude plugin eval` writes; it is not fixture input.
    fixtureHash: hashTree(dir, { exclude: ["results"] }),
  };
}

export function discover(root) {
  const cases = [];
  function walk(dir) {
    if (existsSync(join(dir, "case.yaml"))) {
      cases.push(parseCase(dir));
      return;
    }
    for (const entry of sortedEntries(dir)) {
      if (entry.isDirectory() && entry.name !== "results") walk(join(dir, entry.name));
    }
  }
  walk(resolve(root));
  if (new Set(cases.map((c) => c.name)).size !== cases.length) throw Error("Duplicate case name");
  return cases;
}

// Copies a directory of ordinary files. Links and special files are refused.
export function stage(source, dest) {
  if (!lstatSync(source).isDirectory()) throw Error("Fixture root must be a directory");
  hashTree(source);
  mkdirSync(dest, { recursive: false });
  cpSync(source, dest, { recursive: true, errorOnExist: true, force: false });
}

export function buildArgv(agent, { model, turns, allowedTools }) {
  if (agent === "claude") {
    // The prompt goes on stdin, so a variadic option cannot swallow it.
    // --setting-sources drops user settings (and the plugins they enable);
    // --strict-mcp-config drops every MCP server not passed explicitly.
    const argv = [
      "-p",
      "--model", model,
      "--output-format", "stream-json",
      "--verbose",
      "--max-turns", String(turns),
      "--setting-sources", "project,local",
      "--strict-mcp-config",
    ];
    if (allowedTools.length > 0) argv.push("--allowedTools", allowedTools.join(","));
    return argv;
  }
  if (agent === "codex") {
    // The prompt goes on stdin ("-" is codex exec's explicit stdin marker).
    // Codex has no turn cap; record that difference rather than hide it.
    return ["exec", "--json", "--model", model, "--sandbox", "workspace-write", "--skip-git-repo-check", "-"];
  }
  throw Error("Unknown agent: " + agent);
}

export function score(grade) {
  if (!grade || typeof grade !== "object" || typeof grade.critical !== "boolean") {
    throw Error("Grade requires critical flag");
  }
  if (typeof grade.evidence !== "string" || !grade.evidence.trim()) throw Error("Grade requires evidence");
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const value = grade.scores?.[key];
    if (!Number.isFinite(value) || value < 0 || value > 1) throw Error("Invalid score: " + key);
    total += weight * value;
  }
  return grade.critical ? 0 : Math.round(total * 100) / 100;
}

const round = (value) => Math.round(value * 100) / 100;

function mean(values) {
  return values.length === 0 ? null : round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function validateRecord(record) {
  if (!AGENTS.includes(record.agent) || !ARMS.includes(record.arm) || !STATUSES.includes(record.status)) {
    throw Error("Invalid record: " + record.id);
  }
}

// Pairs the baseline and skills arms of each trial. Only a completed run with
// a grade has a score; anything else is null, never a fabricated zero.
export function summarize(records, grades) {
  const gradeMap = new Map();
  for (const grade of grades) {
    if (gradeMap.has(grade.id)) throw Error("Duplicate grade: " + grade.id);
    score(grade);
    gradeMap.set(grade.id, grade);
  }
  const seen = new Set();
  const groups = new Map();
  for (const record of records) {
    if (seen.has(record.id)) throw Error("Duplicate run: " + record.id);
    seen.add(record.id);
    validateRecord(record);
    const key = JSON.stringify([
      record.agent, record.case, record.trial, record.model, record.version, record.revision, record.fixtureHash,
    ]);
    const pair = groups.get(key) ?? {};
    if (pair[record.arm]) throw Error("Duplicate comparison arm");
    const grade = gradeMap.get(record.id);
    pair[record.arm] = { ...record, score: record.status === "completed" && grade ? score(grade) : null };
    groups.set(key, pair);
  }
  for (const id of gradeMap.keys()) {
    if (!seen.has(id)) throw Error("Grade references unknown run: " + id);
  }
  return [...groups.values()].map((pair) => ({
    ...pair,
    delta: pair.baseline?.score != null && pair.skills?.score != null
      ? round(pair.skills.score - pair.baseline.score)
      : null,
  }));
}

function totalTokens(usage) {
  if (!usage) return null;
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  return Number.isFinite(input + output) ? input + output : null;
}

function armSummary(runs, expectedSkills) {
  const completed = runs.filter((run) => run.status === "completed");
  const scored = runs.filter((run) => run.score != null);
  const withTrace = completed.filter((run) => Array.isArray(run.skillActivations));
  const activated = withTrace.filter((run) => run.skillActivations.some((name) => expectedSkills.includes(name)));
  return {
    runs: runs.length,
    completed: completed.length,
    invalid: runs.filter((run) => run.status === "invalid").length,
    scored: scored.length,
    meanScore: mean(scored.map((run) => run.score)),
    meanElapsedMs: mean(completed.map((run) => run.elapsedMs).filter(Number.isFinite)),
    meanTokens: mean(completed.map((run) => totalTokens(run.usage)).filter(Number.isFinite)),
    meanToolCalls: mean(completed.map((run) => run.toolCalls).filter(Number.isFinite)),
    // Share of completed runs whose trace shows a targeted skill loading,
    // with its denominator; a run without a trace is not counted either way.
    targetActivation: expectedSkills.length === 0 || withTrace.length === 0
      ? null
      : { activated: activated.length, of: withTrace.length, rate: round(activated.length / withTrace.length) },
  };
}

// Aggregates pairs per agent, case, model, agent version, revision and
// fixture, reporting denominators and missing arms instead of hiding them.
export function aggregate(pairs) {
  const groups = new Map();
  for (const pair of pairs) {
    const sample = pair.baseline ?? pair.skills;
    const key = JSON.stringify([
      sample.agent, sample.case, sample.model, sample.version, sample.revision, sample.fixtureHash,
    ]);
    const group = groups.get(key) ?? { sample, pairs: [] };
    group.pairs.push(pair);
    groups.set(key, group);
  }
  return [...groups.values()].map(({ sample, pairs: groupPairs }) => {
    const expectedSkills = sample.expectedSkills ?? [];
    const arm = (name) => groupPairs.map((pair) => pair[name]).filter(Boolean);
    const deltas = groupPairs.map((pair) => pair.delta).filter((delta) => delta != null);
    return {
      agent: sample.agent,
      case: sample.case,
      model: sample.model,
      version: sample.version,
      revision: sample.revision,
      fixtureHash: sample.fixtureHash,
      expectedSkills,
      trials: groupPairs.length,
      missingArms: groupPairs.filter((pair) => !pair.baseline || !pair.skills).length,
      matchedScoredPairs: deltas.length,
      meanDelta: mean(deltas),
      deltas,
      baseline: armSummary(arm("baseline"), expectedSkills),
      skills: armSummary(arm("skills"), expectedSkills),
    };
  });
}

export function buildJudgeArgv(agent, { model, lastMessageFile }) {
  if (agent === "claude") {
    return [
      "-p",
      "--model", model,
      "--output-format", "json",
      "--max-turns", "40",
      "--setting-sources", "project,local",
      "--strict-mcp-config",
      "--allowedTools", "Read,Grep,Glob,Bash",
    ];
  }
  if (agent === "codex") {
    return [
      "exec", "--json", "--model", model, "--sandbox", "workspace-write", "--skip-git-repo-check",
      "--output-last-message", lastMessageFile, "-",
    ];
  }
  throw Error("Unknown agent: " + agent);
}

// The judge sees the task, the expected outcome, the graders and the final
// workspace with the agent's diff. It never sees the arm, the skills or the
// trace, so grading stays blind to which arm produced the work.
// Reads the `expected_outcome: |` block scalar from case.yaml: the indented
// lines that follow the key, up to the next top-level key.
export function expectedOutcome(metadata) {
  const lines = metadata.split(/\r?\n/);
  const start = lines.findIndex((line) => /^expected_outcome:/.test(line));
  if (start < 0) return "";
  const inline = lines[start].replace(/^expected_outcome:\s*/, "");
  if (inline && !/^[|>][-+]?$/.test(inline)) return inline.trim();
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() !== "" && !/^\s/.test(line)) break;
    body.push(line.replace(/^ {2}/, ""));
  }
  return body.join("\n").trim();
}

export function buildJudgePrompt(evalCase, diffPath) {
  const expected = expectedOutcome(evalCase.metadata);
  const graders = evalCase.graders.map((grader) => `### ${grader.name}\n\n${grader.text.trim()}`).join("\n\n");
  return [
    "You are grading a coding agent's finished work. The working directory holds the final state of its workspace.",
    `The agent's complete change, relative to the starting fixture, is in ${diffPath}.`,
    "Inspect the files and that diff. You may run the project's own checks (build, tests, linters).",
    "Do not modify, add or delete any file other than build output.",
    "",
    "## Task given to the agent",
    "",
    evalCase.prompt,
    "",
    "## Expected outcome",
    "",
    expected,
    "",
    "## Graders",
    "",
    graders,
    "",
    "## Output",
    "",
    "Score each dimension from 0 to 1 using only evidence you observed. Set critical to true only for a",
    "critical correctness or security failure. Cite the checks you ran or the lines you read in evidence.",
    "End your reply with exactly one fenced json block of this shape and nothing after it:",
    "",
    "```json",
    JSON.stringify({
      critical: false,
      evidence: "what you observed",
      scores: Object.fromEntries(Object.keys(weights).map((key) => [key, 0])),
    }, null, 2),
    "```",
  ].join("\n");
}

// Extracts the last JSON object from a judge's final message, which may wrap
// it in prose or a fenced block.
export function extractJudgeGrade(text) {
  const fenced = [...String(text).matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)].map((match) => match[1]);
  const candidates = fenced.length > 0 ? fenced : [String(text)];
  for (const candidate of candidates.reverse()) {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start < 0 || end <= start) continue;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      continue;
    }
  }
  throw Error("Judge output contains no JSON grade");
}

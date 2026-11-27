import { readdirSync, readFileSync, lstatSync, existsSync, cpSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

export const weights = Object.freeze({ correctness: 30, maintainability: 20, regression: 15, security: 15, scope: 10, evidence: 10 });
export const digest = (text) => createHash("sha256").update(text).digest("hex");
const entries = (dir) => readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));

export function discover(root) {
  const cases = [];
  function walk(dir) {
    if (existsSync(join(dir, "case.yaml"))) {
      const metadata = readFileSync(join(dir, "case.yaml"), "utf8");
      const name = /^name: ([a-z0-9-]+)$/m.exec(metadata)?.[1];
      const promptFile = readFileSync(join(dir, "prompt.md"), "utf8");
      const front = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(promptFile);
      const timeout = Number(/^timeout_seconds: (\d+)$/m.exec(front?.[1] ?? "")?.[1]);
      const turns = Number(/^max_turns: (\d+)$/m.exec(front?.[1] ?? "")?.[1]);
      if (!name || !front || !Number.isSafeInteger(timeout) || timeout < 1 || timeout > 3600 ||
          !Number.isSafeInteger(turns) || turns < 1 ||
          !/^\s+scaffold_script: stage-inputs\.sh$/m.test(metadata) ||
          !lstatSync(join(dir, "inputs")).isDirectory()) throw Error("Unsupported case: " + dir);
      const graders = entries(join(dir, "graders")).filter(e => e.isFile() && e.name.endsWith(".md"))
        .map(e => ({ name: e.name, text: readFileSync(join(dir, "graders", e.name), "utf8") }));
      if (!graders.length) throw Error("No graders: " + name);
      cases.push({ name, dir, metadata, prompt: front[2].trim(), timeout, turns, graders });
      return;
    }
    for (const entry of entries(dir)) if (entry.isDirectory()) walk(join(dir, entry.name));
  }
  walk(resolve(root));
  if (new Set(cases.map(c => c.name)).size !== cases.length) throw Error("Duplicate case name");
  return cases;
}

export function stage(source, dest) {
  // Fixtures must be ordinary files and directories, never links or special files.
  function verify(dir) {
    for (const entry of entries(dir)) {
      if (entry.isDirectory()) verify(join(dir, entry.name));
      else if (!entry.isFile()) throw Error("Unsupported fixture entry: " + entry.name);
    }
  }
  if (!lstatSync(source).isDirectory()) throw Error("Fixture root must be a directory");
  verify(source);
  mkdirSync(dest, { recursive: false });
  cpSync(source, dest, { recursive: true, errorOnExist: true, force: false });
}

export function score(grade) {
  if (!grade || typeof grade !== "object" || typeof grade.critical !== "boolean") throw Error("Grade requires critical flag");
  if (typeof grade.evidence !== "string" || !grade.evidence.trim()) throw Error("Grade requires evidence");
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const value = grade.scores?.[key];
    if (!Number.isFinite(value) || value < 0 || value > 1) throw Error("Invalid score: " + key);
    total += weight * value;
  }
  return grade.critical ? 0 : Math.round(total * 100) / 100;
}

export function summarize(records, grades) {
  const seen = new Set();
  const gradeMap = new Map();
  for (const g of grades) {
    if (gradeMap.has(g.id)) throw Error("Duplicate grade: " + g.id);
    score(g);
    gradeMap.set(g.id, g);
  }
  const groups = new Map();
  for (const r of records) {
    if (seen.has(r.id)) throw Error("Duplicate run: " + r.id);
    seen.add(r.id);
    if (!["claude", "codex"].includes(r.agent) || !["baseline", "skills"].includes(r.arm) ||
        !["completed", "failed", "blocked", "timeout"].includes(r.status)) throw Error("Invalid record");
    const key = JSON.stringify([r.agent, r.case, r.trial, r.model, r.version, r.revision, r.fixtureHash]);
    const pair = groups.get(key) ?? {};
    if (pair[r.arm]) throw Error("Duplicate comparison arm");
    const g = gradeMap.get(r.id);
    pair[r.arm] = { ...r, score: r.status === "completed" && g ? score(g) : null };
    groups.set(key, pair);
  }
  for (const id of gradeMap.keys()) if (!seen.has(id)) throw Error("Grade references unknown run: " + id);
  return [...groups.values()].map(pair => ({
    ...pair,
    delta: pair.baseline?.score != null && pair.skills?.score != null ? pair.skills.score - pair.baseline.score : null
  }));
}

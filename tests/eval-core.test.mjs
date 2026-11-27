import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { discover, stage, weights, score, summarize } from "../scripts/eval-core.mjs";

const grade = (id, value = 1, critical = false) => ({ id, critical, evidence: "Observed fixture checks", scores: Object.fromEntries(Object.keys(weights).map(k => [k, value])) });
const record = (id, arm, status = "completed") => ({ id, arm, status, agent: "codex", case: "example", trial: 1, model: "test", version: "test", revision: "abc", fixtureHash: "hash" });

test("weighted scores and critical failures", () => {
  assert.equal(score(grade("a", .5)), 50);
  assert.equal(score(grade("a", 1, true)), 0);
  assert.throws(() => score(grade("a", 2)));
  assert.throws(() => score({ ...grade("a"), evidence: "" }));
});
test("paired comparison requires completed graded arms", () => {
  const runs = [record("a", "baseline"), record("b", "skills")];
  assert.equal(summarize(runs, [grade("a", .5), grade("b", .8)])[0].delta, 30);
  assert.equal(summarize(runs, [grade("a")])[0].delta, null);
  assert.equal(summarize([runs[0], record("b", "skills", "timeout")], [grade("a"), grade("b")])[0].delta, null);
  assert.throws(() => summarize([...runs, runs[0]], []));
  assert.throws(() => summarize(runs, [grade("unknown")]));
});
test("fixture staging rejects symlinks and copies ordinary files", t => {
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
test("existing cases are discoverable with graders", () => {
  const cases = discover(new URL("../evals/", import.meta.url).pathname);
  assert.ok(cases.length >= 17);
  assert.ok(cases.every(c => c.graders.length && c.prompt));
});

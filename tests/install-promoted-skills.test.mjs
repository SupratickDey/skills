import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, copyFileSync, symlinkSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const installer = fileURLToPath(new URL("../scripts/install-promoted-skills.sh", import.meta.url));

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "install-skills-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "scripts"));
  copyFileSync(installer, join(root, "scripts", "install-promoted-skills.sh"));
  const add = (bucket, name) => {
    const dir = join(root, "skills", bucket, name);
    mkdirSync(join(dir, "agents"), { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), name);
    writeFileSync(join(dir, "agents", "openai.yaml"), "interface: {}");
  };
  const target = join(root, "destination with spaces");
  const run = () => spawnSync("bash", [join(root, "scripts", "install-promoted-skills.sh"), target], { encoding: "utf8" });
  return { add, target, run };
}

test("copies promoted skills and metadata, not experimental or unknown buckets", (t) => {
  const { add, target, run } = fixture(t);
  add("rust", "one");
  add("workflow", "two");
  add("in-progress", "draft");
  add("other", "unlisted");
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(target).sort(), ["one", "two"]);
  assert.equal(readFileSync(join(target, "one", "agents", "openai.yaml"), "utf8"), "interface: {}");
});

test("preflight preserves existing files and installs nothing on collision", (t) => {
  const { add, target, run } = fixture(t);
  add("rust", "one");
  add("misc", "two");
  mkdirSync(join(target, "two"), { recursive: true });
  writeFileSync(join(target, "two", "SKILL.md"), "existing");
  assert.notEqual(run().status, 0);
  assert.equal(existsSync(join(target, "one")), false);
  assert.equal(readFileSync(join(target, "two", "SKILL.md"), "utf8"), "existing");
});

test("refuses dangling destination symlink", (t) => {
  const { add, target, run } = fixture(t);
  add("rust", "one");
  mkdirSync(target);
  symlinkSync(join(target, "missing"), join(target, "one"));
  assert.notEqual(run().status, 0);
});

test("duplicate names across buckets fail before destination creation", (t) => {
  const { add, target, run } = fixture(t);
  add("rust", "same");
  add("workflow", "same");
  assert.notEqual(run().status, 0);
  assert.equal(existsSync(target), false);
});

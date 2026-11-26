import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/link-skills.sh", import.meta.url));

function scaffold(t) {
  const root = mkdtempSync(join(tmpdir(), "link-skills-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, "repo with spaces");
  const home = join(root, "home");
  mkdirSync(join(repo, "scripts"), { recursive: true });
  cpSync(script, join(repo, "scripts", "link-skills.sh"));
  mkdirSync(join(home, ".claude"), { recursive: true });
  mkdirSync(join(home, ".agents"), { recursive: true });
  function skill(bucket, name) {
    const dir = join(repo, "skills", bucket, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), `# ${name}\n`);
    return dir;
  }
  const promoted = skill("rust", "idiomatic-rust");
  skill("in-progress", "draft-skill");
  return { home, promoted, skill, run: () => spawnSync("bash", [join(repo, "scripts", "link-skills.sh")], { env: { ...process.env, HOME: home }, encoding: "utf8" }) };
}

test("links promoted skills into both agents and reruns idempotently", (t) => {
  const { home, promoted, run } = scaffold(t);
  assert.equal(run().status, 0);
  for (const agent of [".claude", ".agents"]) {
    const target = join(home, agent, "skills");
    assert.equal(readlinkSync(join(target, "idiomatic-rust")), promoted);
    assert.equal(existsSync(join(target, "draft-skill")), false);
  }
  const repeat = run();
  assert.equal(repeat.status, 0, repeat.stderr);
  assert.match(repeat.stdout, /already linked/);
});

test("does not replace a directory or partially link the other agent", (t) => {
  const { home, run } = scaffold(t);
  const occupied = join(home, ".agents", "skills", "idiomatic-rust");
  mkdirSync(occupied, { recursive: true });
  writeFileSync(join(occupied, "SKILL.md"), "user-owned\n");
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing to replace/);
  assert.equal(lstatSync(occupied).isDirectory(), true);
  assert.equal(existsSync(join(home, ".claude", "skills")), false);
});

test("does not replace an unrelated or dangling symlink", (t) => {
  const { home, run } = scaffold(t);
  const occupied = join(home, ".agents", "skills", "idiomatic-rust");
  mkdirSync(join(home, ".agents", "skills"));
  const other = join(home, "missing-skill");
  symlinkSync(other, occupied);
  assert.notEqual(run().status, 0);
  assert.equal(readlinkSync(occupied), other);
});

test("refuses ambiguous duplicate names before writing anything", (t) => {
  const { home, skill, run } = scaffold(t);
  skill("workflow", "idiomatic-rust");
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate promoted skill name/);
  assert.equal(existsSync(join(home, ".claude", "skills")), false);
});

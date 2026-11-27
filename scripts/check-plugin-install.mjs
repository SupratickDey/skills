// Installs the plugin into throwaway Claude Code and Codex homes and checks
// that each agent exposes exactly the promoted skill set. It needs the agent
// CLIs but no credentials or network: both agents read the local marketplace,
// and `codex debug prompt-input` renders the skill catalog without a model.
//
// Usage: node scripts/check-plugin-install.mjs [--agent claude|codex|all]
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { collectSkills } from "./check-skills.mjs";
import { bareSkillName, parseCodexPromptSkills } from "./eval-core.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const PLUGIN = "rewrite-rs-skills";
const MARKETPLACE = "rewrite-rs";
// CLAUDE.md is the contributor instruction file for this repository. The
// validator correctly notes that plugin users do not load it; that is intended.
const ALLOWED_CLAUDE_WARNINGS = [/^CLAUDE\.md at the plugin root is not loaded as project context/];

function run(cmd, argv, options = {}) {
  const result = spawnSync(cmd, argv, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 300_000, ...options });
  if (result.error) throw Error(`${cmd} could not run: ${result.error.message}`);
  return result;
}

function must(result, what) {
  if (result.status !== 0) throw Error(`${what} failed (exit ${result.status}):\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

// Exports the tracked and untracked, non-ignored files: what a user installing
// from Git would receive, without node_modules or build output.
function exportTree(dest) {
  const files = must(run("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root }),
    "git ls-files").split("\0").filter(Boolean);
  for (const file of files) {
    mkdirSync(dirname(join(dest, file)), { recursive: true });
    try {
      cpSync(join(root, file), join(dest, file));
    } catch (error) {
      if (error.code !== "ENOENT") throw error; // a tracked file deleted in the working tree
    }
  }
}

function expectedSkills() {
  const manifest = JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8"));
  const userInvoked = new Set(collectSkills(root).filter((s) => s.userInvoked).map((s) => s.directory));
  const all = manifest.skills.map((path) => path.split("/").at(-1)).sort();
  return { all, modelInvoked: all.filter((name) => !userInvoked.has(name)), userInvoked: [...userInvoked].sort() };
}

function sameSet(label, actual, expected) {
  const missing = expected.filter((name) => !actual.includes(name));
  const extra = actual.filter((name) => !expected.includes(name));
  if (missing.length || extra.length) {
    throw Error(`${label}: missing [${missing.join(", ")}], unexpected [${extra.join(", ")}]`);
  }
}

function checkClaude(source, expected, scratch) {
  const env = { ...process.env, CLAUDE_CONFIG_DIR: join(scratch, "claude-home") };
  const report = JSON.parse(must(run("claude", ["plugin", "validate", source, "--json"], { env }), "claude plugin validate"));
  const findings = [report.manifest, ...(report.contents ?? [])].filter(Boolean);
  const errors = findings.flatMap((entry) => entry.errors ?? []);
  const warnings = findings.flatMap((entry) => entry.warnings ?? [])
    .filter((warning) => !ALLOWED_CLAUDE_WARNINGS.some((pattern) => pattern.test(warning.message)));
  if (!report.success || errors.length || warnings.length) {
    throw Error("claude plugin validate reported problems:\n" + JSON.stringify({ errors, warnings }, null, 2));
  }
  sameSet("claude validate skills", (report.provides?.skills ?? []).map(bareSkillName).sort(), expected.all);

  must(run("claude", ["plugin", "marketplace", "add", source], { env }), "claude marketplace add");
  must(run("claude", ["plugin", "install", `${PLUGIN}@${MARKETPLACE}`], { env }), "claude plugin install");
  const details = must(run("claude", ["plugin", "details", `${PLUGIN}@${MARKETPLACE}`], { env }), "claude plugin details");
  const line = /Skills \((\d+)\)\s+(.+)/.exec(details);
  if (!line) throw Error("claude plugin details did not list skills:\n" + details);
  sameSet("claude installed skills", line[2].split(",").map((name) => name.trim()).sort(), expected.all);
  console.log(`✓ claude: plugin validates and installs with ${expected.all.length} skills`);
}

function checkCodex(source, expected, scratch) {
  const env = { ...process.env, CODEX_HOME: join(scratch, "codex-home") };
  mkdirSync(env.CODEX_HOME);
  must(run("codex", ["plugin", "marketplace", "add", source], { env }), "codex marketplace add");
  must(run("codex", ["plugin", "add", `${PLUGIN}@${MARKETPLACE}`], { env }), "codex plugin add");
  const project = join(scratch, "codex-project");
  mkdirSync(project);
  const prompt = must(run("codex", ["debug", "prompt-input", "catalog probe"], { env, cwd: project }),
    "codex debug prompt-input");
  const visible = parseCodexPromptSkills(prompt)
    .filter((name) => name.startsWith(PLUGIN + ":"))
    .map(bareSkillName)
    .sort();
  // User-invoked skills must stay out of the implicit catalog.
  sameSet("codex implicit skills", visible, expected.modelInvoked);
  console.log(
    `✓ codex: plugin installs; ${visible.length} model-invoked skills visible, ` +
    `${expected.userInvoked.length} user-invoked hidden`
  );
}

const index = process.argv.indexOf("--agent");
const agent = index < 0 ? "all" : process.argv[index + 1];
if (!["claude", "codex", "all"].includes(agent)) throw Error("--agent must be claude, codex or all");

const scratch = mkdtempSync(join(tmpdir(), "rewrite-rs-install-"));
try {
  const source = join(scratch, "plugin-source");
  exportTree(source);
  const expected = expectedSkills();
  if (agent !== "codex") checkClaude(source, expected, scratch);
  if (agent !== "claude") checkCodex(source, expected, scratch);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

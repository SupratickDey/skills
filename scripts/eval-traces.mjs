// Parses agent traces and skill catalogs into comparable run metrics. Pure
// functions only; see eval-core.mjs for how the runner uses them.

// Tool items in `codex exec --json` that represent an action the agent took.
const CODEX_TOOL_ITEMS = new Set(["command_execution", "file_change", "mcp_tool_call", "web_search"]);

// Strips a plugin namespace ("rewrite-rs-skills:rust-config" -> "rust-config").
export function bareSkillName(name) {
  return String(name).split(":").pop();
}

function addUsage(total, usage) {
  if (!usage || typeof usage !== "object") return total;
  const next = { ...(total ?? {}) };
  for (const [key, value] of Object.entries(usage)) {
    if (Number.isFinite(value)) next[key] = (next[key] ?? 0) + value;
  }
  return next;
}

function skillFromPath(text, skillsDir) {
  const pattern = new RegExp(`${skillsDir.replace(/[.]/g, "\\.")}/([a-z0-9-]+)/SKILL\\.md`, "g");
  return [...String(text).matchAll(pattern)].map((match) => match[1]);
}

export function parseClaudeEvents(output) {
  const result = {
    recognized: false,
    isError: null,
    usage: null,
    costUsd: null,
    numTurns: null,
    toolCalls: 0,
    toolCallsByName: {},
    permissionDenials: [],
    skillActivations: [],
    visibleSkills: null,
    visiblePlugins: null,
  };
  const activations = new Set();
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === "system" && event.subtype === "init") {
      result.visibleSkills = Array.isArray(event.skills) ? event.skills.map(String) : null;
      result.visiblePlugins = Array.isArray(event.plugins)
        ? event.plugins.map((plugin) => String(plugin?.source ?? plugin?.name ?? plugin))
        : null;
    }
    if (event.type === "assistant") {
      for (const item of event.message?.content ?? []) {
        if (item.type !== "tool_use") continue;
        result.toolCalls += 1;
        result.toolCallsByName[item.name] = (result.toolCallsByName[item.name] ?? 0) + 1;
        if (item.name === "Skill" && item.input?.skill) activations.add(bareSkillName(item.input.skill));
        if (item.name === "Read" && item.input?.file_path) {
          for (const name of skillFromPath(item.input.file_path, ".claude/skills")) activations.add(name);
        }
      }
    }
    if (event.type === "result") {
      result.recognized = true;
      result.isError = event.is_error === true || (event.subtype !== undefined && event.subtype !== "success");
      result.usage = event.usage ?? null;
      result.costUsd = Number.isFinite(event.total_cost_usd) ? event.total_cost_usd : null;
      result.numTurns = Number.isFinite(event.num_turns) ? event.num_turns : null;
      result.permissionDenials = (event.permission_denials ?? []).map((denial) => String(denial?.tool_name ?? denial));
    }
  }
  result.skillActivations = [...activations].sort();
  return result;
}

export function parseCodexEvents(output) {
  const result = {
    recognized: false,
    isError: null,
    usage: null,
    costUsd: null,
    numTurns: 0,
    toolCalls: 0,
    toolCallsByName: {},
    permissionDenials: [],
    skillActivations: [],
    visibleSkills: null,
    visiblePlugins: null,
  };
  const activations = new Set();
  let failed = false;
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === "turn.completed") {
      result.recognized = true;
      result.numTurns += 1;
      result.usage = addUsage(result.usage, event.usage);
    }
    if (event.type === "turn.failed") {
      result.recognized = true;
      failed = true;
    }
    // Count each tool item once, when it finishes; file_change items have no
    // started event.
    if (event.type === "item.completed" && CODEX_TOOL_ITEMS.has(event.item?.type)) {
      result.toolCalls += 1;
      result.toolCallsByName[event.item.type] = (result.toolCallsByName[event.item.type] ?? 0) + 1;
      if (event.item.type === "command_execution") {
        for (const name of skillFromPath(event.item.command, ".agents/skills")) activations.add(name);
      }
    }
  }
  if (result.recognized) result.isError = failed;
  else result.numTurns = null;
  result.skillActivations = [...activations].sort();
  return result;
}

// Parses the skill catalog from `codex debug prompt-input` output: entries
// look like "- name: description (file: r1/name/SKILL.md)".
// The output is JSON, so every string in it is decoded before scanning.
export function parseCodexPromptSkills(output) {
  const strings = [];
  const collect = (value) => {
    if (typeof value === "string") strings.push(value);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  };
  try {
    collect(JSON.parse(output));
  } catch {
    strings.push(output);
  }
  const names = new Set();
  for (const text of strings) {
    for (const match of text.matchAll(/^- ([A-Za-z0-9:_.-]+): .*\(file: [^)]*SKILL\.md\)\s*$/gm)) {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

// Decides whether an arm saw the skill set it was meant to see. Missing
// visibility data is unknown, which the caller records rather than passes.
export function checkVisibility(arm, visibleSkills, { repoSkills, modelInvoked }) {
  if (!Array.isArray(visibleSkills)) return { checked: false, ok: null, problems: [] };
  const visible = new Set(visibleSkills.map(bareSkillName));
  const problems = [];
  if (arm === "baseline") {
    const leaked = repoSkills.filter((name) => visible.has(name));
    if (leaked.length > 0) problems.push("baseline exposes repository skills: " + leaked.join(", "));
  } else {
    const missing = modelInvoked.filter((name) => !visible.has(name));
    if (missing.length > 0) problems.push("skills arm is missing model-invoked skills: " + missing.join(", "));
  }
  return { checked: true, ok: problems.length === 0, problems };
}

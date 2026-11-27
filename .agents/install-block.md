# Install block

One wording for the install instructions exists, and it lives here. Every place that
tells a user how to install this skill set — `README.md`, docs pages, release notes —
copies the named blocks below verbatim. Do not paraphrase, reformat, or
re-order them. If the wording needs to change, change it here first; every consumer
picks the change up from this file, not the other way around.

## `npx-whole-set`

```bash
npx skills@latest add SupratickDey/skills
```

Pick the skills you want, and which coding agents to install them on.

## `claude-code`

```
/plugin marketplace add SupratickDey/skills
/plugin install rewrite-rs-skills@rewrite-rs
```

## `claude-code-shell`

```bash
claude plugin marketplace add SupratickDey/skills
claude plugin install rewrite-rs-skills@rewrite-rs
```

Run these in a terminal instead of inside a session. To share the plugin through a
repository, run the install command with `--scope project` inside it and commit
`.claude/settings.json`. Each teammate then runs the `marketplace add` command once;
the plugin then loads in that repository only.

## `gh-skill`

```bash
gh skill install SupratickDey/skills --all
```

To install one skill, name it:

```bash
gh skill install SupratickDey/skills rust/idiomatic-rust
```

Requires GitHub CLI 2.90.0 or later. Project scope is the default; `--scope user`
installs for your account, and `--agent <name>` picks the target agent. Without a
version, `gh skill` installs from the latest tagged release.

## `gemini-cli`

```bash
for skill in \
  rust/async-rust rust/idiomatic-rust rust/ownership-not-clone rust/rust-api-design \
  rust/rust-concurrency rust/rust-config rust/rust-docs rust/rust-errors rust/rust-observability \
  rust/rust-architecture rust/rust-security \
  rust/rust-api-development rust/rust-database rust/rust-resilience \
  rust/rust-cross-platform rust/rust-cli-development rust/rust-memory-profiling rust/rust-distributed-systems \
  rust/rust-performance rust/type-driven-design rust/unsafe-rust \
  porting/port-from-c porting/port-from-cpp porting/port-from-go porting/port-from-java \
  porting/port-from-python porting/port-from-typescript porting/port-to-rust \
  workflow/rust-code-review workflow/rust-debugging workflow/rust-skills-map workflow/rust-testing \
  workflow/rust-refactoring workflow/rust-implementation-planning workflow/rust-production-readiness \
  workflow/rust-workspace-management \
  workflow/setup-rust-skills \
  misc/rust-ffi misc/rust-macros misc/rust-serde misc/rust-supply-chain \
  misc/setup-rust-ci misc/setup-rust-pre-commit
do
  gemini skills install https://github.com/SupratickDey/skills.git --path "skills/$skill" --consent
done
```

This installs for your user. Add `--scope workspace` to install for the current project
only.

## `codex`

**Installation and skill discovery are verified with Codex CLI 0.172.0. Skill use in a live
Codex session is not yet verified.**

```bash
codex plugin marketplace add SupratickDey/skills
codex plugin add rewrite-rs-skills@rewrite-rs
```

Or open the `/plugins` browser in Codex and install `rewrite-rs-skills` from the
`rewrite-rs` marketplace. Start a new session afterwards. Codex offers the model-invoked
skills automatically; the four user-invoked skills (`rust-skills-map`, `setup-rust-skills`,
`setup-rust-ci` and `setup-rust-pre-commit`) load only when you name them. If the skills do not appear, remove the plugin and use the
`manual-copy` block instead. Codex reads skills from `.agents/skills/` in a repo, or from
`~/.agents/skills/` for your user.

## `manual-copy`

```bash
git clone https://github.com/SupratickDey/skills rewrite-rs-skills
cd rewrite-rs-skills
mkdir -p ~/.agents/skills
bash scripts/install-promoted-skills.sh ~/.agents/skills
```

This copies only the promoted skill directories into a flat skills directory.
The installer preflights name collisions and refuses to overwrite existing
skills. Run it with Bash; select a destination for just one agent. Replace
`~/.agents/skills` with the directory for your agent:

Where each agent looks, for your user and for a single project:

- Claude Code: `~/.claude/skills/` for you, `.claude/skills/` in a project.
- OpenAI Codex: `~/.agents/skills/` for you, `.agents/skills/` in a project.
- GitHub Copilot: `~/.copilot/skills/` or `~/.agents/skills/` for you; `.github/skills/` or `.agents/skills/` in a project.
- Cursor: `~/.cursor/skills/` or `~/.agents/skills/` for you; `.cursor/skills/` or `.agents/skills/` in a project.
- Gemini CLI: `~/.gemini/skills/` or `~/.agents/skills/` for you; `.gemini/skills/` or `.agents/skills/` in a project.

Claude Code ignores `.agents/skills/`. Give it `.claude/skills/` or `~/.claude/skills/`,
or take the plugin route. If a freshly copied skill is missing, restart the agent.

## `claude-ai-zip`

```bash
git clone https://github.com/SupratickDey/skills rewrite-rs-skills
mkdir -p skill-zips
for dir in rewrite-rs-skills/skills/{rust,porting,workflow,misc}/*/; do
  [ -f "$dir/SKILL.md" ] || continue
  name=$(basename "$dir")
  (cd "$(dirname "$dir")" && zip -r "$OLDPWD/skill-zips/$name.zip" "$name" -x '*.DS_Store')
done
```

Each zip has a single skill folder at its root. Turn on code execution first, then
upload every zip from the **Customize > Skills** page.

## The one-step form is not ready

A route, `claude plugins install rewrite-rs-skills`, would let a user skip the
marketplace-add step entirely. It requires this plugin to be listed in
`anthropics/claude-plugins-official`, which has not happened. **Do not document the
one-step form to users until that listing lands.** That includes the `--marketplace`
flag of `claude plugin install`, which is the same shortcut in one command. Only the
two-step blocks above are canonical until then.

## The routes are exclusive

Pick one. The plugin routes (`claude-code`, `claude-code-shell`, `codex`) install a managed,
read-only bundle that Claude Code updates on its own schedule. The file-copy routes
(`npx-whole-set`, `gh-skill`, `gemini-cli`, `manual-copy`) write editable files that the
user then owns and can modify. Installing through both families leaves every skill
duplicated, and the two copies will drift. The same holds for two file-copy routes aimed
at one directory. Every consumer of these blocks must say "pick one," never present
them as if they stack. The `claude-ai-zip` route uploads to claude.ai, a separate
product, and does not overlap with the local routes.

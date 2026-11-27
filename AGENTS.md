# AGENTS.md

Rules for any session that authors, edits, or reviews a skill in this repo. Read
`.agents/invocation.md`, `.agents/install-block.md`, and `.agents/writing-docs.md`
before touching skill content — this file points at them rather than repeating them.

## Shared engineering discipline

These instructions govern contributions to this skill repository. They do not
automatically install rules in a consumer project. Skills must respect the
consumer project's applicable instructions, approved specifications, security
boundaries and authorized task scope.

Before changing files, inspect the current branch and working tree, read the
applicable specification, contracts, ADRs and authoring rules, and identify the
acceptance criteria. Resolve conflicts and material missing decisions with the
owner before the dependent change. Plan non-trivial changes, not routine edits.

- Fix the underlying cause with a complete, contained change. Preserve public
  contracts, existing architecture, dependencies and unrelated user changes.
  Do not suppress errors or weaken checks to make progress.
- Keep modules cohesive and abstractions justified by a present need. Prefer
  explicit dependencies, clear ownership and small reviewable changes. Review
  files approaching 500 lines for responsibility boundaries; do not split them
  mechanically or restructure unrelated code.
- Keep comments focused on non-obvious invariants and contracts. Put plans and
  decision history in documentation, not source comments. Use plain professional
  English, no emojis or em/en dashes in newly authored prose. Preserve literals,
  external contracts, licenses and quoted source material. Do not add unsolicited
  generation attribution or commit trailers; retain required attribution.
- Never expose secrets or sensitive fixtures. Validate trust boundaries and
  preserve authorization, signing, tenant isolation and required audit trails
  where applicable. Do not bypass safeguards or attempt unapproved workarounds.
- Follow the documented branch and contribution process in docs/contributing.md.
  Use Conventional Commits. Commit, push, merge and release only when authorized
  for that operation; never force-push or overwrite user changes. Check effective
  author and committer identity; do not change global configuration.
- Run the actual repository checks at the configured lint level. Do not claim
  success for checks that did not execute. Distinguish compilation, tests,
  simulation, hardware validation and runtime agent evaluations. Report blocked
  checks, scope changes, and remaining risks before requesting integration.

## Consumer project guidance

When authoring guidance for software projects, distinguish mandatory project
rules from task-specific skills. Require centralized typed and validated
configuration where appropriate; document each operational setting, default,
unit and range without real secrets. Preserve domain rules and tenant settings
in their approved storage. Keep generated code and applied migrations intact;
use project generators and new migrations. Refactoring preserves observable
behaviour and requires appropriate regression coverage. None of these
principles authorizes a skill to write files on its own or override the
target project's documented decisions.

## 1. Buckets

`skills/rust/` (language craft), `skills/porting/` (migration),
`skills/workflow/` (review, testing, setup, router), and `skills/misc/`
(occasional setup and audit skills, reached for less often) are **promoted**.
`skills/in-progress/` (public, unshipped) is **not promoted**.

Every promoted skill must appear in all three of:

- `README.md`
- both `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` explicit `skills` arrays
- `docs/<bucket>/<name>.md`

A non-promoted skill appears in none of the three. The split that decides which
bucket a skill lives in is frequency of use — how often an agent reaches for it — not
whether the skill happens to write files into a user's repo.

## 2. Prose-dominant with verification

Skills teach judgment in prose. Commands inside a skill are inline instructions the
agent runs itself, never shipped runner scripts the skill invokes on the user's
behalf. Every skill where a machine can settle the question it makes ends with a
verification step the agent actually runs — see
`.agents/adr/0001-verification-steps-run-cargo.md`.

## 3. Config precedence

A verification step runs at the lint level configured in the target repo.
`cargo clippy -- -D warnings` is the fallback only when the target repo has no lint
configuration at all. A skill must never override a lint level the user (or an
earlier `setup-rust-skills` run) deliberately set.

## 4. One porting language per session

Never author or revise two `port-from-*` language skills in the same session. See
`.agents/adr/0003-one-skill-per-source-language.md` for why the set is split by
source language in the first place.

## 5. No citations in skill files

Sources live in `.agents/sources.md`, not inside any `SKILL.md` or docs page.

## 6. Invocation

See `.agents/invocation.md` for the full rules on user-invoked versus model-invoked
skills, and for what agrees between the frontmatter flag in Claude Code and the
`agents/openai.yaml` policy in Codex.
Any skill that writes files into the user's repo is user-invoked, in any
bucket; `rust-skills-map` is user-invoked without writing files, because it is
a router the user consults directly. The user-invoked skills are therefore
`setup-rust-skills` and `rust-skills-map` in `workflow/`, and
`setup-rust-ci` and `setup-rust-pre-commit` in `misc/`. Every other skill is
model-invoked.

## 7. Router upkeep

Whenever a user-reachable skill is added, renamed, removed, or changes how it fits
the flows, re-read `rust-skills-map`'s `SKILL.md` and update it in the same change.
A router that omits a new skill or routes to a dead one is a router that lies.

## 8. Docs pages

See `.agents/writing-docs.md` for the page template. Trigger: adding, renaming, or
behaviour-changing a promoted skill means its `docs/<bucket>/<name>.md` page is
created or re-synced in the same change. A rename moves the file — it does not leave
the old page behind and add a new one.

## 9. Checks

Run these before considering skill work done:

- `npm run check` — runs the test harness, the index checker (`check-skills.mjs`),
  the plugin-version check (`sync-plugin-version.mjs --check`), and the example
  compile gate (`check-examples.mjs`).
- `npm run check:install` after touching either plugin manifest or marketplace
  file. It runs `claude plugin validate`, then installs the plugin into
  throwaway Claude Code and Codex homes and compares the visible skills with
  the manifests. Its only accepted validator warning is that the root
  `CLAUDE.md` is not loaded for plugin users, which is intended; that warning
  is why `claude plugin validate . --strict` exits nonzero here.
- `scripts/link-skills.sh` — symlinks skills into the local harness for manual
  testing.

## 10. Progressive disclosure

Keep SKILL.md focused on activation, essential decisions, safety invariants
and verification. Move specialized detail into references within that skill's
own directory, with an explicit reading trigger. Do not load every reference
or unrelated skill by default. Never move critical preconditions out of the
main guidance merely to reduce length. Preserve manual invocation controls
and test explicit and implicit activation separately in both agents.

## 11. Code examples

A complete, self-contained Rust example is fenced ` ```rust `. A deliberate fragment —
a snippet using symbols defined elsewhere, a signature with no body, illustrative
pseudocode — is fenced ` ```rust,ignore `. Untagged means "this compiles", so an
untagged block that does not compile is a bug. See `.agents/code-examples.md`.

Skills authored from now on are written to this convention. `npm run check`
compiles every untagged block; an untagged block that does not compile fails the
check.

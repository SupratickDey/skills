---
name: setup-rust-pre-commit
description: Set up fast pre-commit hooks for a Rust repo — format and lint the staged changes only, with CI left as the real gate.
disable-model-invocation: true
---

# Setup Rust Pre-commit

This skill is user-invoked. A local hook is a convenience; CI is the
authoritative verification gate. Prefer a fast, read-only formatting check.
Do not install hooks, change Git configuration or overwrite existing hook
managers without the user's approval.

## Inspect and select a mechanism

Read the effective core.hooksPath (including its origin), existing hook scripts,
pre-commit configuration or lefthook configuration, recorded Rust posture,
workspace layout and supported shell/platform. Preserve the existing manager
and unrelated checks. Offer a diff before updating existing files. Use the
repository's approved toolchain, lint policy and formatting command.

## What is actually checked

Cargo fmt selects packages and modules, not an arbitrary staged filename list;
cargo clippy checks compilation units, not individual files. Do not append
staged paths to cargo fmt or shell-expand a whitespace-delimited file list.
Use a NUL-delimited staged path inventory to decide whether a check is needed.
A package/workspace check reads working-tree files and may inspect unstaged
changes or recurse into modules. Do not call that an index-only check.

For an inexpensive conservative check, reject when relevant tracked content
has unstaged changes and explain that the hook checks the working tree, not
a staged snapshot. If exact index-only verification is required, construct
an isolated snapshot of the index and run the approved commands there.
Handle symlinks, submodules and missing prerequisites explicitly; do not
silently substitute working-tree content. A check must not overwrite, stage,
stash or restore user changes.

## Scope and cost

Use formatting in report-only mode. Optional clippy must use the approved
package and feature configuration and configured lint levels. If it is slow,
requires network access or cannot be made reliable, leave it in CI.
Document measured latency rather than promising a universal two-second bound.
Tests, dependency audits and release builds generally belong in CI.

Never auto-format and restage partially staged files. A separately authorized
formatting operation is not a hook default; show the proposed changes and
let the user stage them. Use the adaptable scripts in HOOKS.md.

## Verification

Test the proposed hook in a disposable temporary Git repository with local
configuration and synthetic files, not in the user's working repository.
Check rejection and acceptance, filenames containing spaces, partial staging,
failed tools, clean/no-Rust changes and preservation of the index and files.
Measure representative latency. Do not create probe commits in the target
repository, reset its history or change global Git configuration.
Run syntax checks for the chosen script and validate manager configuration.
Run actual Rust formatting when the toolchain is available; if using a stub
to verify shell control flow, report that distinction. Verify the approved
installation path without performing an unauthorized real commit.

#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Keep the historical developer-harness behavior: only use initialized agent
# home directories. Preflight every destination before making any changes.
sources=()
names=()
targets=()
for bucket in rust porting workflow misc; do
  for skill_dir in "$REPO_ROOT/skills/$bucket"/*/; do
    [ -f "$skill_dir/SKILL.md" ] || continue
    name="$(basename "$skill_dir")"
    for existing in "${names[@]+${names[@]}}"; do
      if [ "$existing" = "$name" ]; then
        printf 'duplicate promoted skill name: %s\n' "$name" >&2
        exit 1
      fi
    done
    sources+=("${skill_dir%/}")
    names+=("$name")
  done
done

for target in "$HOME/.claude/skills" "$HOME/.agents/skills"; do
  [ -d "$(dirname "$target")" ] || continue
  targets+=("$target")
  if { [ -e "$target" ] || [ -L "$target" ]; } && [ ! -d "$target" ]; then
    printf 'skill directory is not a directory: %s\n' "$target" >&2
    exit 1
  fi
  for i in "${!names[@]}"; do
    destination="$target/${names[$i]}"
    if [ -L "$destination" ] && [ "$(readlink "$destination")" = "${sources[$i]}" ]; then
      continue
    fi
    if [ -e "$destination" ] || [ -L "$destination" ]; then
      printf 'refusing to replace existing skill: %s\n' "$destination" >&2
      exit 1
    fi
  done
done

for target in "${targets[@]+${targets[@]}}"; do
  mkdir -p "$target"
  for i in "${!names[@]}"; do
    destination="$target/${names[$i]}"
    if [ -L "$destination" ] && [ "$(readlink "$destination")" = "${sources[$i]}" ]; then
      printf 'already linked %s\n' "$destination"
      continue
    fi
    if [ -e "$destination" ] || [ -L "$destination" ]; then
      printf 'refusing to replace existing skill: %s\n' "$destination" >&2
      exit 1
    fi
    ln -s "${sources[$i]}" "$destination"
    printf 'linked %s\n' "$destination"
  done
done

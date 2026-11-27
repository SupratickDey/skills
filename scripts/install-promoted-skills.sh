#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ] || [ -z "$1" ]; then
  printf '%s\n' 'usage: install-promoted-skills.sh DESTINATION' >&2
  exit 2
fi
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target="$1"
sources=()
names=()
for bucket in rust porting workflow misc; do
  for dir in "$root/skills/$bucket"/*/; do
    [ -f "$dir/SKILL.md" ] || continue
    name="$(basename "$dir")"
    for existing in "${names[@]+${names[@]}}"; do
      if [ "$existing" = "$name" ]; then
        printf 'duplicate promoted skill name: %s\n' "$name" >&2
        exit 1
      fi
    done
    sources+=("${dir%/}")
    names+=("$name")
  done
done
if [ "${#names[@]}" -eq 0 ]; then
  printf '%s\n' 'no promoted skills found' >&2
  exit 1
fi
if { [ -e "$target" ] || [ -L "$target" ]; } && [ ! -d "$target" ]; then
  printf 'destination is not a directory: %s\n' "$target" >&2
  exit 1
fi
for name in "${names[@]}"; do
  if [ -e "$target/$name" ] || [ -L "$target/$name" ]; then
    printf 'refusing to replace existing skill: %s\n' "$target/$name" >&2
    exit 1
  fi
done
mkdir -p -- "$target"
for i in "${!names[@]}"; do
  destination="$target/${names[$i]}"
  # mkdir fails if a destination appeared after preflight.
  mkdir -- "$destination"
  cp -R -- "${sources[$i]}/." "$destination/"
  printf 'installed %s\n' "$destination"
done

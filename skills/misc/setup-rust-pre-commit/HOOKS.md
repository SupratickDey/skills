# Pre-commit hook templates

Adapt to the approved package scope, toolchain and shell. The conservative
example below checks the working tree only when a relevant staged change
exists and no tracked working-tree differences remain. It never edits
source, the index or Git history. It is not exact index-only verification:
untracked modules or external configuration can still affect the result.

## Read-only script

Use this example for a Bash-compatible Cargo workspace after approval.
Keep it as a shared script for the existing hook manager where appropriate.

```bash
#!/usr/bin/env bash
set -euo pipefail

root=$(git rev-parse --show-toplevel)
cd "$root"
paths=$(mktemp)
trap 'rm -f -- "$paths"' EXIT

git diff --cached --name-only -z --diff-filter=ACDMRT -- > "$paths"
relevant=0
while IFS= read -r -d '' path; do
  case "$path" in
    *.rs|Cargo.toml|*/Cargo.toml|Cargo.lock|*/Cargo.lock|rustfmt.toml|*/rustfmt.toml|.rustfmt.toml|*/.rustfmt.toml|rust-toolchain|*/rust-toolchain|rust-toolchain.toml|*/rust-toolchain.toml|.cargo/*|*/.cargo/*)
      relevant=1 ;;
  esac
done < "$paths"

if [ "$relevant" -eq 0 ]; then
  exit 0
fi

if ! git diff --quiet --; then
  printf '%s\n' 'pre-commit: unstaged tracked changes; formatting check needs a consistent working tree.' >&2
  exit 1
fi

cargo fmt --all --check
```

The path list is NUL-delimited, and no path is interpolated into a command.
The conservative guard rejects any unstaged tracked changes when a relevant
staged change exists, including partially staged files. Explain this
restriction before adoption. The workspace command can include other
packages; select the approved scope rather than pretending it checks only
the staged files. Check untracked inputs and configuration separately if
the repository requires exact snapshot verification. Fail closed on Git
or formatter errors. Adapt the temporary directory and Bash requirements
to the supported operating systems.

## Hook managers

For core.hooksPath, place the approved script in the existing hook path or
a new agreed repository-local directory. Do not replace an existing hook,
change a global config or install without permission.

For lefthook, add an approved command invoking the same read-only script.
For pre-commit, use a local system-language hook with pass_filenames false
and an entry invoking the script. These managers have different handling of
unstaged changes; verify the actual invocation and do not assume their
isolation behavior. Do not replace an existing configuration wholesale.

## Optional linting

Add a separate check only when the recorded package/feature selection,
existing toolchain and measured latency justify it. Cargo clippy operates
on compilation units, not staged filenames. Keep the configured lint level
and do not run dependency installation or network-bound tasks in a hook.

## Verification in isolation

Use a disposable Git repository with its own local identity and configuration.
Stage synthetic clean and malformed Rust files, including paths with spaces.
Exercise partial staging and verify the script rejects without changing
the index or working-tree content. Exercise an unrelated change and tool
failure. Test the selected manager's actual invocation and record latency.
Use the actual formatter where available; a stub only verifies shell control
flow. Do not create test commits or reset history in the target repository.

## Contributing notes

Document the installation procedure, required shell/toolchain, actual
package scope, read-only behavior, unstaged-change restriction and
measured latency. State that local hooks are not a substitute for CI and
that any bypass is subject to the repository's approved policy.

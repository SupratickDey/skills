## What it does

Command contracts, output streams and exit semantics. It applies to the approved project and its supported environments,
not to speculative changes or unrequested tooling.

## When to reach for it

Model-invoked: Design or implement Rust command-line tools, argument parsing, subcommands, configuration precedence, output formats, exit codes and terminal behavior. Use for CLI UX, shell integration and automation-compatible output. Not for general application configuration design or choosing a new CLI dependency without need. Users can invoke it directly by name.

## Decisions and verification

### Establish the command contract

Inspect existing commands, flags, aliases, exit codes, output formats, config
precedence, completion scripts and automation consumers. Preserve scripts
and documented behavior unless a breaking change is approved. Use the
existing argument parser (for example clap if already present). Do not
introduce a framework for a small command without a requirement.

Separate argument decoding from validation and execution. Use typed values,
explicit conflicts and requirements, and useful errors. Do not unwrap
untrusted arguments. Reuse `/rust-config` for settings precedence and
`/type-driven-design` for domain invariants. Do not expose credentials in
help, shell history, process arguments or diagnostic output.

### Output and interaction

Keep requested machine-readable data on stdout; send diagnostics and progress
to stderr when consistent with the documented contract. Never mix log lines
or terminal escape codes into JSON, CSV or another structured stream.
Honor the existing color policy, terminal detection and noninteractive mode.
Do not prompt unexpectedly in automated or redirected input. Handle broken
pipes according to the command's documented behavior rather than panicking
on output failures. Buffer or stream large output deliberately.

Return documented exit status for success, usage errors and execution
failures. Do not report success for incomplete operations. Keep help and
version output consistent with the command schema. Account for OS-native
paths and argument encoding; use OsString or PathBuf where applicable.

### Safe execution and file changes

Do not construct a shell command from untrusted arguments. Pass arguments
separately to a child process and propagate exit and cancellation semantics
according to the contract. Validate destinations and overwrite policy before
mutating files. Destructive commands require appropriate explicit intent;
a dry run must not perform the changes it previews. For long operations,
respect cancellation and cleanup, and never expose secrets in progress or
error output. Route platform-specific behavior to `/rust-cross-platform`.

### Verification

Test actual binary invocations in an isolated directory with controlled
arguments, environment and input streams. Cover help, invalid flags, conflicts,
default and explicit settings, stdout/stderr separation, exit status, paths
with spaces, structured output and noninteractive execution. Test destructive
operations only on synthetic fixtures; verify rejected and dry-run operations
leave state unchanged. Run configured format, clippy and tests at the
project lint level (-D warnings only without a configured policy).
Report missing shell/platform and integration evidence.

## Common questions

**Does this skill authorize a new dependency or supported environment?** No.
Inspect existing choices and obtain approval for a material change.

**What if the required verification environment is unavailable?** Report
what was inspected or simulated, and distinguish the missing execution evidence.

## It's working if

- Documented flags, exit codes and output remain stable.
- Structured stdout contains only the contracted data.
- Invalid input and dry runs do not cause unintended mutations.
- Binary-level tests verify streams, exit status and noninteractive behavior.

## Where it fits

Use `/rust-config` for related concerns. See [rust-skills-map](../workflow/rust-skills-map.md)
for the full routing table.

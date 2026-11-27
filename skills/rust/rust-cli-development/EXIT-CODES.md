# Exit codes and output streams

Read this when implementing a command's top-level flow, its exit statuses or
its handling of standard output. The example uses only std so the contract is
visible; with an existing parser such as clap, keep the same separation
between decoding, execution and reporting.

The contract it shows:

- Each exit status is a documented constant. Scripts depend on the numbers,
  so changing one is a breaking change.
- Data goes to stdout and diagnostics go to stderr, never mixed.
- Arguments arrive as `OsString`; non-UTF-8 input is a usage error, not a
  panic.
- A closed stdout pipe (`tool | head -n 1`) ends the command quietly with
  success, because this command documents that behavior. Rust ignores
  `SIGPIPE`, so the write returns `BrokenPipe` instead of killing the process.
- `run` takes its streams as parameters, so tests can drive the whole command
  without spawning a process.

```rust
use std::ffi::OsString;
use std::io::{self, Write};
use std::process::ExitCode;

pub const EXIT_OK: u8 = 0;
pub const EXIT_FAILURE: u8 = 1;
pub const EXIT_USAGE: u8 = 2;

const USAGE: &str = "usage: greet [--upper] NAME...";

#[derive(Debug, PartialEq, Eq)]
struct Args {
    upper: bool,
    names: Vec<String>,
}

fn parse(args: impl IntoIterator<Item = OsString>) -> Result<Args, String> {
    let mut upper = false;
    let mut names = Vec::new();
    for arg in args {
        let arg = arg
            .into_string()
            .map_err(|raw| format!("argument is not valid UTF-8: {}", raw.display()))?;
        match arg.as_str() {
            "--upper" => upper = true,
            flag if flag.starts_with('-') => return Err(format!("unknown option {flag}")),
            _ => names.push(arg),
        }
    }
    if names.is_empty() {
        return Err("expected at least one NAME".to_owned());
    }
    Ok(Args { upper, names })
}

fn write_greetings(args: &Args, out: &mut impl Write) -> io::Result<()> {
    for name in &args.names {
        let name = if args.upper { name.to_uppercase() } else { name.clone() };
        writeln!(out, "hello, {name}")?;
    }
    out.flush()
}

/// Runs the command and returns its exit status.
pub fn run(args: impl IntoIterator<Item = OsString>, out: &mut impl Write, err: &mut impl Write) -> u8 {
    let args = match parse(args) {
        Ok(args) => args,
        Err(message) => {
            // Nothing useful remains if stderr itself is gone.
            let _ = writeln!(err, "greet: {message}\n{USAGE}");
            return EXIT_USAGE;
        }
    };
    match write_greetings(&args, out) {
        Ok(()) => EXIT_OK,
        Err(error) if error.kind() == io::ErrorKind::BrokenPipe => EXIT_OK,
        Err(error) => {
            let _ = writeln!(err, "greet: cannot write output: {error}");
            EXIT_FAILURE
        }
    }
}

fn main() -> ExitCode {
    let status = run(std::env::args_os().skip(1), &mut io::stdout().lock(), &mut io::stderr().lock());
    ExitCode::from(status)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(values: &[&str]) -> Vec<OsString> {
        values.iter().map(OsString::from).collect()
    }

    struct ClosedPipe;

    impl Write for ClosedPipe {
        fn write(&mut self, _: &[u8]) -> io::Result<usize> {
            Err(io::ErrorKind::BrokenPipe.into())
        }
        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }

    #[test]
    fn data_on_stdout_and_nothing_on_stderr() {
        let (mut out, mut err) = (Vec::new(), Vec::new());
        assert_eq!(run(args(&["--upper", "ada"]), &mut out, &mut err), EXIT_OK);
        assert_eq!(out, b"hello, ADA\n");
        assert!(err.is_empty());
    }

    #[test]
    fn usage_errors_exit_2_and_write_no_data() {
        let (mut out, mut err) = (Vec::new(), Vec::new());
        assert_eq!(run(args(&["--loud", "ada"]), &mut out, &mut err), EXIT_USAGE);
        assert!(out.is_empty());
        assert!(String::from_utf8(err).unwrap().contains("unknown option --loud"));
    }

    #[test]
    fn a_closed_pipe_is_not_a_failure() {
        let mut err = Vec::new();
        assert_eq!(run(args(&["ada"]), &mut ClosedPipe, &mut err), EXIT_OK);
        assert!(err.is_empty());
    }
}
```

Unit tests like these cover the decision logic. Still run the built binary in
an isolated directory for the contract itself: exit statuses seen by a shell,
redirected and closed streams, and paths with spaces.

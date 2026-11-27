# Joining an untrusted relative path

Read this when a path from configuration, an archive, a request or another
user-controlled source is joined onto a base directory. String checks such as
"does not contain `..`" miss platform forms: an absolute path, a Windows drive
prefix (`C:x`), a UNC prefix, or a root such as `\x`. Classifying the path's
components with `std::path` handles each platform's rules.

```rust
use std::path::{Component, Path, PathBuf};

#[derive(Debug, PartialEq, Eq)]
pub enum UnsafePath {
    Empty,
    /// Absolute, rooted, or carrying a Windows drive or UNC prefix.
    NotRelative,
    ParentComponent,
}

/// Joins `relative` under `base`, accepting only plain names and `.`.
///
/// This is a lexical check. It does not follow symbolic links: if the base
/// directory can contain links an attacker controls, also resolve the final
/// path (for example with `std::fs::canonicalize`) and confirm it still lies
/// under the canonical base before using it.
pub fn join_within(base: &Path, relative: &Path) -> Result<PathBuf, UnsafePath> {
    let mut joined = base.to_path_buf();
    let mut any = false;
    for component in relative.components() {
        match component {
            Component::Normal(name) => {
                joined.push(name);
                any = true;
            }
            Component::CurDir => {}
            Component::ParentDir => return Err(UnsafePath::ParentComponent),
            Component::RootDir | Component::Prefix(_) => return Err(UnsafePath::NotRelative),
        }
    }
    if any { Ok(joined) } else { Err(UnsafePath::Empty) }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_nested_relative_names() {
        let base = Path::new("data");
        assert_eq!(join_within(base, Path::new("a/./b.txt")), Ok(base.join("a").join("b.txt")));
    }

    #[test]
    fn rejects_traversal_and_absolute_paths() {
        let base = Path::new("data");
        assert_eq!(join_within(base, Path::new("../secret")), Err(UnsafePath::ParentComponent));
        assert_eq!(join_within(base, Path::new("a/../../b")), Err(UnsafePath::ParentComponent));
        assert_eq!(join_within(base, Path::new("/etc/passwd")), Err(UnsafePath::NotRelative));
        assert_eq!(join_within(base, Path::new("")), Err(UnsafePath::Empty));
    }

    #[cfg(windows)]
    #[test]
    fn rejects_windows_prefixes() {
        let base = Path::new("data");
        for raw in [r"C:\x", r"C:x", r"\\server\share\x", r"\x"] {
            assert_eq!(join_within(base, Path::new(raw)), Err(UnsafePath::NotRelative), "{raw}");
        }
    }
}
```

The Windows-only test runs only on a Windows target. Run the suite on every
supported platform in CI rather than reasoning about separators from one
machine. Keep paths as `Path` and `OsStr` until the point of display; use
`Path::display` for messages instead of converting with lossy UTF-8 earlier.

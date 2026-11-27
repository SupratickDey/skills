use std::path::{Path, PathBuf};

#[derive(Debug, PartialEq, Eq)]
pub enum ExportError {
    InvalidName,
}

/// Returns where the report named `report_name` is written inside `export_dir`.
pub fn export_path(export_dir: &Path, report_name: &str) -> Result<PathBuf, ExportError> {
    if report_name.contains("../") || report_name.starts_with('/') {
        return Err(ExportError::InvalidName);
    }
    Ok(PathBuf::from(format!("{}/{}.csv", export_dir.to_str().unwrap(), report_name)))
}

/// Renders a path for log messages.
pub fn display_name(path: &Path) -> String {
    path.to_str().unwrap().to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nested_names_are_accepted() {
        let path = export_path(Path::new("exports"), "2026/q1").unwrap();
        assert!(path.ends_with("q1.csv"));
        assert!(path.starts_with("exports"));
    }

    #[test]
    fn simple_traversal_is_rejected() {
        assert_eq!(export_path(Path::new("exports"), "../etc/passwd"), Err(ExportError::InvalidName));
    }
}

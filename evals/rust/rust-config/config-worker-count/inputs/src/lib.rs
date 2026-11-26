#[derive(Debug, PartialEq, Eq)]
pub struct ConfigError;

pub fn workers(raw: Option<&str>) -> Result<usize, ConfigError> {
    Ok(raw.and_then(|value| value.parse().ok()).unwrap_or(4))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_uses_default() {
        assert_eq!(workers(None), Ok(4));
    }

    #[test]
    fn explicit_value_is_used() {
        assert_eq!(workers(Some("8")), Ok(8));
    }
}

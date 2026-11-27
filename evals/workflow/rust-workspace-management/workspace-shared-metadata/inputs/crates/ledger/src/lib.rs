//! Ledger arithmetic.

/// Sums ledger entries, saturating instead of overflowing.
pub fn total(entries: &[i64]) -> i64 {
    entries.iter().fold(0i64, |sum, entry| sum.saturating_add(*entry))
}

#[cfg(test)]
mod tests {
    #[test]
    fn totals_entries() {
        assert_eq!(super::total(&[3, -1, 5]), 7);
    }
}

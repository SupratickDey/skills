#[derive(Debug, PartialEq, Eq)]
pub enum SubmitError {
    Empty,
    Overflow,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Entry {
    pub amount: u64,
}

#[derive(Default)]
pub struct Ledger {
    pub entries: Vec<Entry>,
}

impl Ledger {
    fn record(&mut self, entry: Entry) {
        self.entries.push(entry);
    }
}

pub fn submit(ledger: &mut Ledger, quantity: u64, unit_price: u64) -> Result<u64, SubmitError> {
    if quantity == 0 {
        return Err(SubmitError::Empty);
    }
    let amount = quantity
        .checked_mul(unit_price)
        .ok_or(SubmitError::Overflow)?;
    ledger.record(Entry { amount });
    Ok(amount)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn records_amount() {
        let mut ledger = Ledger::default();
        assert_eq!(submit(&mut ledger, 2, 5), Ok(10));
        assert_eq!(ledger.entries, vec![Entry { amount: 10 }]);
    }
}

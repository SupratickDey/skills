use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Delivery {
    pub account: String,
    /// Per-account sequence assigned by the producer, starting at 1, with no gaps.
    pub sequence: u64,
    pub amount: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Ack {
    /// Remove the message from the queue.
    Ack,
    /// Leave the message on the queue; the broker redelivers it later.
    Retry,
}

pub trait Ledger {
    fn balance(&self, account: &str) -> i64;
    /// The highest sequence whose effect is stored for `account`; 0 if none.
    fn applied_sequence(&self, account: &str) -> u64;
    /// Adds `amount` and records `sequence` as applied, in one atomic write.
    fn apply(&mut self, account: &str, amount: i64, sequence: u64);
}

#[derive(Default)]
pub struct InMemoryLedger {
    accounts: HashMap<String, (i64, u64)>,
}

impl Ledger for InMemoryLedger {
    fn balance(&self, account: &str) -> i64 {
        self.accounts.get(account).map_or(0, |entry| entry.0)
    }

    fn applied_sequence(&self, account: &str) -> u64 {
        self.accounts.get(account).map_or(0, |entry| entry.1)
    }

    fn apply(&mut self, account: &str, amount: i64, sequence: u64) {
        let entry = self.accounts.entry(account.to_owned()).or_insert((0, 0));
        entry.0 += amount;
        entry.1 = sequence;
    }
}

/// Handles one delivery and tells the broker whether to remove it.
pub fn handle(ledger: &mut impl Ledger, delivery: &Delivery) -> Ack {
    ledger.apply(&delivery.account, delivery.amount, delivery.sequence);
    Ack::Ack
}

#[cfg(test)]
mod tests {
    use super::*;

    fn delivery(account: &str, sequence: u64, amount: i64) -> Delivery {
        Delivery { account: account.to_owned(), sequence, amount }
    }

    #[test]
    fn applies_messages_in_order() {
        let mut ledger = InMemoryLedger::default();
        assert_eq!(handle(&mut ledger, &delivery("a", 1, 10)), Ack::Ack);
        assert_eq!(handle(&mut ledger, &delivery("a", 2, -3)), Ack::Ack);
        assert_eq!(ledger.balance("a"), 7);
        assert_eq!(ledger.applied_sequence("a"), 2);
    }
}

# Applying at-least-once, possibly reordered messages

Read this when a consumer must apply messages from a queue or log that can
redeliver or reorder them. The example keeps state in memory so the rule is
visible; the same rule holds for a database-backed consumer.

The rule: every message for a key carries the producer's sequence number for
that key, and the consumer stores the last sequence it applied next to the
state it changed. Then:

- A sequence at or below the stored one is a redelivery. Acknowledge it
  without applying it again.
- The next sequence is applied, and the stored sequence advances in the same
  atomic write as the state. If they are written separately, a crash between
  the two writes either applies the message twice or loses it.
- A sequence beyond the next one means an earlier message has not arrived.
  Do not apply it and do not acknowledge it, so the broker redelivers it
  later, or park it according to the documented policy.

Where messages have no per-key order, deduplicate by message id instead and
keep the processed-id record in the same transaction as the effect, with a
retention period longer than the broker's redelivery window.

```rust
use std::collections::HashMap;

pub struct Message {
    pub account: String,
    /// Producer-assigned sequence for this account, starting at 1.
    pub sequence: u64,
    pub delta: i64,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Outcome {
    /// Applied; acknowledge it.
    Applied,
    /// Already applied; acknowledge it without changing state.
    Redelivered,
    /// An earlier message is missing; do not acknowledge it.
    Gap { expected: u64 },
}

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct Account {
    pub balance: i64,
    pub applied_sequence: u64,
}

#[derive(Default)]
pub struct Consumer {
    accounts: HashMap<String, Account>,
}

impl Consumer {
    pub fn handle(&mut self, message: &Message) -> Outcome {
        let current = self.accounts.get(&message.account).copied().unwrap_or_default();
        let expected = current.applied_sequence + 1;
        if message.sequence < expected {
            return Outcome::Redelivered;
        }
        if message.sequence > expected {
            return Outcome::Gap { expected };
        }
        // The balance and the sequence change in one write.
        let next = Account {
            balance: current.balance + message.delta,
            applied_sequence: message.sequence,
        };
        self.accounts.insert(message.account.clone(), next);
        Outcome::Applied
    }

    pub fn account(&self, name: &str) -> Account {
        self.accounts.get(name).copied().unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn message(sequence: u64, delta: i64) -> Message {
        Message { account: "acct-1".to_owned(), sequence, delta }
    }

    #[test]
    fn redelivery_does_not_apply_twice() {
        let mut consumer = Consumer::default();
        assert_eq!(consumer.handle(&message(1, 10)), Outcome::Applied);
        assert_eq!(consumer.handle(&message(1, 10)), Outcome::Redelivered);
        assert_eq!(consumer.account("acct-1").balance, 10);
    }

    #[test]
    fn a_gap_is_held_until_the_missing_message_arrives() {
        let mut consumer = Consumer::default();
        assert_eq!(consumer.handle(&message(2, 5)), Outcome::Gap { expected: 1 });
        assert_eq!(consumer.account("acct-1"), Account::default());
        assert_eq!(consumer.handle(&message(1, 10)), Outcome::Applied);
        assert_eq!(consumer.handle(&message(2, 5)), Outcome::Applied);
        assert_eq!(consumer.account("acct-1"), Account { balance: 15, applied_sequence: 2 });
    }
}
```

Test duplicate delivery, reordering, a missing message, and a crash between
handling and acknowledgment in the real storage layer. The in-memory version
cannot show that the state and the sequence are committed atomically; that has
to be verified against the actual store.

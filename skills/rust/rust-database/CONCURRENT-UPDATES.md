# Conditional updates against lost writes

Read this when two requests can read and then write the same row. A plain
read, modify, write sequence loses one of the updates when they interleave.
A version column with a conditional update makes the database detect the
race; the affected-row count is the signal.

```sql
UPDATE accounts
SET balance = $1, version = version + 1
WHERE tenant_id = $2 AND id = $3 AND version = $4
```

Zero affected rows means the row changed since it was read, or it does not
exist for this tenant. Tell the two apart with the documented contract (for
example a follow-up existence check inside the same tenant scope) rather than
guessing.

The example below models that contract with an in-memory store so the
decision logic and its tests stay visible. The store's `update_if_version`
is the stand-in for the statement above; in a real service it is one query
on the transaction or connection that owns the operation.

```rust
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Account {
    pub balance: i64,
    pub version: u64,
}

#[derive(Debug, PartialEq, Eq)]
pub enum UpdateError {
    NotFound,
    /// The row changed after it was read. Safe to retry the whole
    /// read-modify-write only if the operation allows it.
    Conflict,
    InsufficientFunds,
}

#[derive(Default)]
pub struct Store {
    rows: HashMap<u64, Account>,
}

impl Store {
    pub fn insert(&mut self, id: u64, balance: i64) {
        self.rows.insert(id, Account { balance, version: 1 });
    }

    pub fn get(&self, id: u64) -> Option<Account> {
        self.rows.get(&id).copied()
    }

    /// Mirrors `UPDATE ... WHERE id = $id AND version = $expected` and
    /// returns the affected-row count.
    pub fn update_if_version(&mut self, id: u64, expected: u64, balance: i64) -> u64 {
        match self.rows.get_mut(&id) {
            Some(row) if row.version == expected => {
                row.balance = balance;
                row.version += 1;
                1
            }
            _ => 0,
        }
    }
}

/// Withdraws using a value read earlier at version `read.version`.
pub fn withdraw(store: &mut Store, id: u64, read: Account, amount: i64) -> Result<Account, UpdateError> {
    let balance = read.balance.checked_sub(amount).ok_or(UpdateError::InsufficientFunds)?;
    if balance < 0 {
        return Err(UpdateError::InsufficientFunds);
    }
    match store.update_if_version(id, read.version, balance) {
        1 => Ok(Account { balance, version: read.version + 1 }),
        _ if store.get(id).is_none() => Err(UpdateError::NotFound),
        _ => Err(UpdateError::Conflict),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_second_of_two_racing_writes_conflicts_instead_of_overwriting() {
        let mut store = Store::default();
        store.insert(7, 100);
        let first_read = store.get(7).unwrap();
        let second_read = store.get(7).unwrap();
        assert_eq!(withdraw(&mut store, 7, first_read, 30), Ok(Account { balance: 70, version: 2 }));
        assert_eq!(withdraw(&mut store, 7, second_read, 50), Err(UpdateError::Conflict));
        assert_eq!(store.get(7).unwrap().balance, 70);
    }

    #[test]
    fn missing_rows_and_overdrafts_are_distinct_errors() {
        let mut store = Store::default();
        store.insert(7, 10);
        let read = store.get(7).unwrap();
        assert_eq!(withdraw(&mut store, 7, read, 11), Err(UpdateError::InsufficientFunds));
        assert_eq!(withdraw(&mut store, 8, read, 1), Err(UpdateError::NotFound));
        assert_eq!(store.get(7), Some(read));
    }
}
```

With SQLx the same decision reads the driver's result on the transaction that
owns the operation:

```rust,ignore
let affected = sqlx::query(UPDATE_IF_VERSION)
    .bind(new_balance)
    .bind(tenant_id)
    .bind(id)
    .bind(read.version)
    .execute(&mut *tx)
    .await?
    .rows_affected();
```

The in-memory tests prove the decision logic only. Verify the real statement
against an isolated instance of the supported engine with two concurrent
writers, because isolation level, triggers and the driver's row-count
semantics are properties of the engine, not of this code.

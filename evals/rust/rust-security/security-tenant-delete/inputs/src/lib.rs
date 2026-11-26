#[derive(Debug)]
pub struct Principal {
    pub tenant: u64,
    pub can_delete: bool,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Record {
    pub tenant: u64,
    pub id: u64,
}

pub fn delete(records: &mut Vec<Record>, principal: &Principal, id: u64) -> bool {
    if !principal.can_delete {
        return false;
    }
    if let Some(index) = records.iter().position(|record| record.id == id) {
        records.remove(index);
        true
    } else {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn authorized_delete() {
        let principal = Principal { tenant: 1, can_delete: true };
        let mut records = vec![Record { tenant: 1, id: 9 }];
        assert!(delete(&mut records, &principal, 9));
        assert!(records.is_empty());
    }
}

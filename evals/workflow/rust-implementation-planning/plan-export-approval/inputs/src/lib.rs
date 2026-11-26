#[derive(Debug, PartialEq, Eq)]
pub struct Record {
    pub tenant: u64,
    pub value: String,
}

pub fn records_for(records: &[Record], tenant: u64) -> impl Iterator<Item = &Record> {
    records.iter().filter(move |record| record.tenant == tenant)
}

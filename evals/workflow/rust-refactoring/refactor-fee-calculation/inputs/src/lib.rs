#[derive(Debug, PartialEq, Eq)]
pub enum FeeError {
    Negative,
    Overflow,
}

pub fn invoice_fee(amount: i64) -> Result<i64, FeeError> {
    if amount < 0 {
        return Err(FeeError::Negative);
    }
    let scaled = amount.checked_mul(3).ok_or(FeeError::Overflow)?;
    Ok(scaled / 100)
}

pub fn refund_fee(amount: i64) -> Result<i64, FeeError> {
    if amount < 0 {
        return Err(FeeError::Negative);
    }
    let scaled = amount.checked_mul(2).ok_or(FeeError::Overflow)?;
    Ok(scaled / 100)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normal_fees() {
        assert_eq!(invoice_fee(1000), Ok(30));
        assert_eq!(refund_fee(1000), Ok(20));
    }
}

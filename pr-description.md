## Skip balance checks in TransactionSidesheetFooter

Temporarily hardcodes both `connectedAccountHasEnoughBalance` and `multisigHasEnoughBalance` to `true` in `TransactionSidesheetFooter` while we work on updating the metadata and balances logic.

The original balance checks are commented out and will be restored once the underlying data is reliable.

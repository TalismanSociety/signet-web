import { MultisendSend, TableColumnKeys } from './MultisendTable'

type TableError = Partial<Record<TableColumnKeys, string>>
export const validateMultisendRow = (send: MultisendSend, canVest?: boolean): TableError | undefined => {
  if (send.recipient === undefined && (send.amount === undefined || send.amount === '') && send.vested === undefined)
    return undefined
  const errors: TableError = {}
  if (!send.recipient) errors.recipient = 'Recipient is required'
  if (!send.amount) errors.amount = 'Amount is required'
  if (canVest && send.vested) {
    if (send.vested.start === 0) errors.start = 'Start block is required'
    if (send.vested.end === 0) errors.end = 'End block is required'
    if (send.vested.start >= send.vested.end) {
      errors.start = 'Start block must be before end block'
      errors.end = 'End block must be after start block'
    }
  }
  return errors
}

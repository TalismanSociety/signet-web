import { MultisendSend, TableColumnKeys } from './MultisendTable'
import { MultisigWithExtraData } from '@domains/multisig'

type TableError = Partial<Record<TableColumnKeys, string>>
export const validateMultisendRow = (
  send: MultisendSend,
  multisig: MultisigWithExtraData,
  canVest?: boolean
): TableError | undefined => {
  if (send.recipient === undefined && (send.amount === undefined || send.amount === '') && send.vested === undefined)
    return undefined
  const errors: TableError = {}
  if (!send.recipient) errors.recipient = 'Recipient is required'
  if (send.recipient && send.recipient.isEthereum !== multisig.isEthereumAccount)
    errors.recipient = `Address format not compatible with ${multisig.chain?.chainName} chain`
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

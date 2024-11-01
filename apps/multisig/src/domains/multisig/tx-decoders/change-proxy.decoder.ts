import { TransactionType } from '@domains/offchain-data/metadata/types'
import { TxDecoder } from './tx-decoders.types'
import { Address, parseCallAddressArg } from '@util/addresses'

export const decodeChangeProxy: TxDecoder = ({ methodArg, multisig, metadata }) => {
  if (methodArg?.section === 'proxy') {
    if (methodArg.method === 'addProxy' || methodArg.method === 'removeProxy') {
      const { delegate, proxy_type } = methodArg.args
      const address = Address.fromSs58(parseCallAddressArg(delegate))
      if (!address) throw new Error('Add proxy destination is not a valid address')
      const action = methodArg.method === 'addProxy' ? 'Add' : 'Remove'
      return {
        decoded: {
          type: TransactionType.Advanced,
          recipients: [],
        },
        description: metadata?.description ?? `${action} ${address.toShortSs58(multisig.chain)} as ${proxy_type} proxy`,
      }
    }
  }
  return null
}

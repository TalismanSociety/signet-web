import { TransactionType } from '@domains/offchain-data/metadata/types'
import { TxDecoder } from './tx-decoders.types'
import { Address, parseCallAddressArg } from '@util/addresses'

// Check if it's a Smart Contract call
export const decodeContractCall: TxDecoder = ({ methodArg, metadata, multisig }) => {
  if (methodArg?.section === 'contracts' && methodArg?.method === 'call') {
    const { dest, data } = methodArg.args
    const address = Address.fromSs58(parseCallAddressArg(dest))
    if (!address) throw new Error('Contract call destination is not a valid address')
    return {
      decoded: {
        type: TransactionType.ContractCall,
        recipients: [],
        contractCall: {
          address,
          data,
        },
      },
      description: metadata?.description ?? `Contract call to ${address.toShortSs58(multisig.chain)}`,
    }
  }

  return null
}

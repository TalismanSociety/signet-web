import { Address, parseCallAddressArg, toMultisigAddress } from '@util/addresses'
import { TxDecoder } from './tx-decoders.types'
import { TransactionType } from '@domains/offchain-data/metadata/types'

interface ChangeConfigCall {
  section: 'utility'
  method: 'batchAll'
  args: {
    calls: [
      {
        method: 'addProxy'
        args: {
          proxy_type: 'Any'
          delegate:
            | {
                Id: string
              }
            | string
        }
      },
      {
        method: 'removeProxy'
        args: {
          proxy_type: 'Any'
        }
      }
    ]
  }
}

const isChangeConfigCall = (arg: any): arg is ChangeConfigCall => {
  return (
    arg?.section === 'utility' &&
    arg?.method === 'batchAll' &&
    arg?.args?.calls.length === 2 &&
    arg?.args?.calls[0]?.method === 'addProxy' &&
    arg?.args?.calls[1]?.method === 'removeProxy' &&
    arg.args?.calls[0]?.args?.proxy_type === 'Any' &&
    arg.args?.calls[1]?.args?.proxy_type === 'Any' &&
    (typeof arg.args?.calls[0]?.args?.delegate === 'string' || arg.args?.calls[0]?.args?.delegate?.Id)
  )
}

export const decodeChangeConfig: TxDecoder = ({ metadata, methodArg }) => {
  // Check if it's a ChangeConfig type
  if (metadata?.changeConfigDetails && isChangeConfigCall(methodArg)) {
    const { changeConfigDetails } = metadata
    // Validate that the metadata 'new configuration' info matches the
    // actual multisig that is being set on chain.
    const derivedNewMultisigAddress = toMultisigAddress(
      changeConfigDetails.newMembers,
      changeConfigDetails.newThreshold
    )
    const actualNewMultisigAddress = Address.fromSs58(parseCallAddressArg(methodArg.args.calls[0].args.delegate))
    if (actualNewMultisigAddress === false) throw Error('got an invalid ss52Address back from the chain!')
    if (!derivedNewMultisigAddress.isEqual(actualNewMultisigAddress)) {
      throw Error("Derived multisig address doesn't match actual multisig address")
    }

    return {
      decoded: {
        type: TransactionType.ChangeConfig,
        recipients: [],
        changeConfigDetails: {
          signers: changeConfigDetails.newMembers,
          threshold: changeConfigDetails.newThreshold,
        },
      },
      description: metadata?.description ?? 'Change multisig config',
    }
  }

  return null
}

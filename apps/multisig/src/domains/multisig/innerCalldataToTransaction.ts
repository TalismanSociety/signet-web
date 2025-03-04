import { BaseToken, decodeCallData } from '@domains/chains'
import { extrinsicToDecoded } from './index'
import { TransactionDecoded } from '@domains/offchain-data/metadata/types'
import { ApiPromise } from '@polkadot/api'
import { getErrorString } from '@util/misc'
import { Multisig } from './index'
import { TxMetadata } from '@domains/offchain-data/metadata/types'

export const innerCalldataToTransaction = (
  calldata: `0x${string}`,
  multisig: Multisig,
  api: ApiPromise,
  curChainTokens: BaseToken[],
  otherTxMetadata?: Pick<TxMetadata, 'changeConfigDetails' | 'contractDeployed'>
): {
  error?: string
  transaction?: {
    decoded: TransactionDecoded
    hash: `0x${string}`
    calldata: `0x${string}`
  }
} => {
  try {
    const innerExtrinsic = decodeCallData(api, calldata)
    const proxyExtrinsic = api.tx.proxy.proxy(multisig.proxyAddress.bytes, null, innerExtrinsic)
    const hash = proxyExtrinsic.registry.hash(proxyExtrinsic.method.toU8a()).toHex()
    const decoded = extrinsicToDecoded(multisig, proxyExtrinsic, curChainTokens, otherTxMetadata)
    if (decoded === 'not_ours') return { error: 'Not ours' }

    return {
      transaction: {
        hash,
        decoded: decoded.decoded,
        calldata: proxyExtrinsic.method.toHex(),
      },
    }
  } catch (e) {
    return { error: getErrorString(e) }
  }
}

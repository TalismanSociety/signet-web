import { BaseToken, decodeCallData } from '@domains/chains'
import { TransactionDecoded, extrinsicToDecoded } from './index'
import { ApiPromise } from '@polkadot/api'
import { getErrorString } from '@util/misc'
import { Multisig, TxOffchainMetadata } from '.'

export const innerCalldataToTransaction = (
  calldata: `0x${string}`,
  multisig: Multisig,
  api: ApiPromise,
  curChainTokens: BaseToken[],
  otherTxMetadata?: Pick<TxOffchainMetadata, 'changeConfigDetails'>
): {
  error?: string
  transaction?: {
    decoded: TransactionDecoded
    hash: `0x${string}`
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
      },
    }
  } catch (e) {
    return { error: getErrorString(e) }
  }
}

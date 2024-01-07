import { ApiPromise } from '@polkadot/api'
import { useCallback, useMemo, useState } from 'react'
import { allChainTokensSelector, decodeCallData, useApproveAsMulti } from '../chains'
import { Multisig } from './types'
import {
  Transaction,
  TransactionApprovals,
  TxOffchainMetadata,
  extrinsicToDecoded,
  useNextTransactionSigner,
} from './index'
import { useRecoilValueLoadable } from 'recoil'

// TODO: use this hook in all new transaction
export const useMultisigExtrinsicFromCalldata = (
  description: string,
  team: Multisig,
  calldata: `0x${string}`,
  api?: ApiPromise,
  otherTxMetadata?: TxOffchainMetadata
) => {
  const [approving, setApproving] = useState(false)
  const allActiveChainTokens = useRecoilValueLoadable(allChainTokensSelector)

  // decode the inner calldata (this is the actual extrinsic, e.g. transfer tokens)
  const innerExtrinsic = useMemo(() => {
    if (!api) return undefined

    try {
      const extrinsic = decodeCallData(api, calldata as `0x{string}`)
      if (!extrinsic) return { error: 'Could not decode calldata!', ok: false }
      return { ok: true, extrinsic }
    } catch (error) {
      if (error instanceof Error) return { error: `Invalid calldata: ${error.message}`, ok: false }
      else return { error: `Invalid calldata: unknown error`, ok: false }
    }
  }, [api, calldata])

  // the proxy extrinsic that wraps the inner extrinsic
  const proxyExtrinsic = useMemo(() => {
    if (!api) return undefined
    if (!api.tx.proxy?.proxy) return { ok: false, error: 'Proxy module not supported on this chain.' }
    if (!innerExtrinsic?.extrinsic)
      return innerExtrinsic?.error ? { error: innerExtrinsic?.error, ok: false } : undefined

    const proxyExtrinsic = api.tx.proxy.proxy(team.proxyAddress.bytes, null, innerExtrinsic.extrinsic)
    return { ok: true, extrinsic: proxyExtrinsic }
  }, [api, innerExtrinsic, team.proxyAddress.bytes])

  const hash = proxyExtrinsic?.extrinsic
    ? proxyExtrinsic?.extrinsic?.registry.hash(proxyExtrinsic.extrinsic.method.toU8a()).toHex()
    : undefined

  const t: Transaction | undefined = useMemo(() => {
    if (allActiveChainTokens.state !== 'hasValue') return undefined
    const curChainTokens = allActiveChainTokens.contents.get(team.chain.squidIds.chainData)

    if (!proxyExtrinsic?.extrinsic || !curChainTokens) return undefined
    const decoded = extrinsicToDecoded(team, proxyExtrinsic?.extrinsic, curChainTokens)

    // only for type safety, this should not happen because proxy address is crafted on the spot
    if (decoded === 'not_ours') return undefined
    return {
      date: new Date(),
      hash: hash || '0x',
      description,
      multisig: team,
      approvals: team.signers.reduce((acc, key) => {
        acc[key.toPubKey()] = false
        return acc
      }, {} as TransactionApprovals),
      decoded: decoded.decoded,
      callData: proxyExtrinsic?.extrinsic.method.toHex(),
    }
  }, [allActiveChainTokens.state, allActiveChainTokens.contents, team, proxyExtrinsic?.extrinsic, hash, description])

  const signer = useNextTransactionSigner(t?.approvals)
  const { approveAsMulti, estimatedFee, ready } = useApproveAsMulti(signer?.address, hash, null, t?.multisig)

  const approve = useCallback(async () => {
    await new Promise((resolve, reject) => {
      // this should not happen because if !extrinsic the summary would not be open
      if (!proxyExtrinsic?.extrinsic || !t) return

      setApproving(true)
      approveAsMulti({
        metadata: {
          description: t?.description,
          callData: proxyExtrinsic?.extrinsic.method.toHex(),
          ...otherTxMetadata,
        },
        onSuccess: r => {
          setApproving(false)
          resolve(r)
        },
        onFailure: e => {
          reject(e)
          setApproving(false)
        },
      })
    })
  }, [approveAsMulti, otherTxMetadata, proxyExtrinsic?.extrinsic, t])

  return { innerExtrinsic, proxyExtrinsic, hash, approving, approve, t, estimatedFee, ready }
}

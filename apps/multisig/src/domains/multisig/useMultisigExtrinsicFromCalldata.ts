import { ApiPromise, SubmittableResult } from '@polkadot/api'
import { useCallback, useMemo, useState } from 'react'
import { allChainTokensSelector, decodeCallData, useApproveAsMulti, useAsMulti } from '../chains'
import { Multisig } from './types'
import { Transaction, TransactionApprovals, extrinsicToDecoded, useNextTransactionSigner } from './index'
import { useRecoilValueLoadable } from 'recoil'
import { TxMetadata } from '@domains/offchain-data'

/**
 * @param submittedTx calldata, description and otherTxMetadata are ignored if this is provided
 * @returns
 */
export const useMultisigExtrinsicFromCalldata = (
  description: string,
  team: Multisig,
  calldata: `0x${string}`,
  api?: ApiPromise,
  otherTxMetadata?: Pick<TxMetadata, 'changeConfigDetails' | 'contractDeployed'>,
  submittedTx?: Transaction
) => {
  const [approving, setApproving] = useState(false)
  const allActiveChainTokens = useRecoilValueLoadable(allChainTokensSelector)

  // decode the inner calldata (this is the actual extrinsic, e.g. transfer tokens)
  const innerExtrinsic = useMemo(() => {
    if (!api || submittedTx?.hash) return undefined

    try {
      const extrinsic = decodeCallData(api, calldata as `0x{string}`)
      if (!extrinsic) return { error: 'Could not decode calldata!', ok: false }
      return { ok: true, extrinsic }
    } catch (error) {
      if (error instanceof Error) return { error: `Invalid calldata: ${error.message}`, ok: false }
      else return { error: `Invalid calldata: unknown error`, ok: false }
    }
  }, [api, calldata, submittedTx])

  // the proxy extrinsic that wraps the inner extrinsic
  const proxyExtrinsic = useMemo(() => {
    if (submittedTx?.hash) return undefined
    if (!api) return undefined
    if (!api.tx.proxy?.proxy) return { ok: false, error: 'Proxy module not supported on this chain.' }
    if (!innerExtrinsic?.extrinsic)
      return innerExtrinsic?.error ? { error: innerExtrinsic?.error, ok: false } : undefined

    const proxyExtrinsic = api.tx.proxy.proxy(team.proxyAddress.bytes, null, innerExtrinsic.extrinsic)
    return { ok: true, extrinsic: proxyExtrinsic }
  }, [api, innerExtrinsic?.error, innerExtrinsic?.extrinsic, submittedTx, team.proxyAddress.bytes])

  const hash =
    submittedTx?.hash ??
    (proxyExtrinsic?.extrinsic
      ? proxyExtrinsic?.extrinsic?.registry.hash(proxyExtrinsic.extrinsic.method.toU8a()).toHex()
      : undefined)

  const t: Transaction | undefined = useMemo(() => {
    if (submittedTx?.hash) return submittedTx as Transaction

    if (allActiveChainTokens.state !== 'hasValue') return undefined
    const curChainTokens = allActiveChainTokens.contents.get(team.chain.squidIds.chainData)

    if (!proxyExtrinsic?.extrinsic || !curChainTokens) return undefined
    const decoded = extrinsicToDecoded(team, proxyExtrinsic?.extrinsic, curChainTokens, otherTxMetadata)

    // only for type safety, this should not happen because proxy address is crafted on the spot
    if (decoded === 'not_ours') return undefined
    return {
      ...submittedTx,
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
  }, [
    submittedTx,
    allActiveChainTokens.state,
    allActiveChainTokens.contents,
    team,
    proxyExtrinsic?.extrinsic,
    otherTxMetadata,
    hash,
    description,
  ])

  const readyToExecute = useMemo(() => {
    if (!t) return team.threshold === 1
    const approvals = Object.values(t.approvals).filter(a => a).length
    return approvals >= team.threshold - 1
  }, [team.threshold, t])

  const signer = useNextTransactionSigner(t?.approvals)
  const {
    approveAsMulti,
    estimatedFee: approveFee,
    ready: approveReady,
  } = useApproveAsMulti(signer?.address, hash, t?.rawPending?.onChainMultisig.when ?? null, t?.multisig)

  const { asMulti, estimatedFee: asMultiFee, ready: asMultiReady } = useAsMulti(signer?.address, t)

  const approve = useCallback(async () => {
    return await new Promise<{ result: SubmittableResult; executed: boolean }>((resolve, reject) => {
      if (!t?.callData) return reject(new Error('No call data'))
      setApproving(true)

      // approve tx if not ready to execute
      if (!readyToExecute) {
        approveAsMulti({
          saveMetadata: !t.metadataSaved,
          metadata: {
            description: t?.description,
            callData: t.callData,
            ...otherTxMetadata,
          },
          onSuccess: r => {
            setApproving(false)
            resolve({ result: r, executed: false })
          },
          onFailure: e => {
            setApproving(false)
            reject(e)
          },
        })
      } else {
        // execute tx since it already has enough approvals
        if (!asMultiReady) {
          setApproving(false)
          console.error("attempt to call asMulti before it's ready")
          return reject(new Error('Please try again later.'))
        }
        asMulti({
          onSuccess(r) {
            setApproving(false)
            resolve({ result: r, executed: true })
          },
          onFailure(e) {
            setApproving(false)
            reject(e)
          },
        })
      }
    })
  }, [approveAsMulti, asMulti, asMultiReady, otherTxMetadata, readyToExecute, t])

  return {
    innerExtrinsic,
    proxyExtrinsic,
    hash,
    approving,
    approve,
    t,
    estimatedFee: readyToExecute ? asMultiFee : approveFee,
    ready: readyToExecute ? asMultiReady : approveReady,
    readyToExecute,
  }
}

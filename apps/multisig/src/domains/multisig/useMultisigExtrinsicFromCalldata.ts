import { ApiPromise, SubmittableResult } from '@polkadot/api'
import { useCallback, useMemo, useState } from 'react'
import { allChainTokensSelector, decodeCallData, useApproveAsMulti, useAsMulti, useAsMultiThreshold1 } from '../chains'
import { Multisig } from './types'
import { Transaction, TransactionApprovals, extrinsicToDecoded, useNextTransactionSigner } from './index'
import { useRecoilValueLoadable } from 'recoil'
import { TxMetadata } from '@domains/offchain-data'
import { Balance as MultisigBalance } from '@domains/multisig'

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

  const signer = useNextTransactionSigner(t?.approvals, team.threshold)
  const {
    approveAsMulti,
    estimatedFee: approveFee,
    ready: approveReady,
  } = useApproveAsMulti(signer?.address, hash, t?.rawPending?.onChainMultisig.when ?? null, t?.multisig)

  const { asMulti, estimatedFee: asMultiFee, ready: asMultiReady } = useAsMulti(signer?.address, t)
  const {
    asMultiThreshold1,
    estimatedFee: asMultiThreshold1Fee,
    ready: asMultiThreshold1Ready,
  } = useAsMultiThreshold1(signer?.address, t)

  type Approve = 'approveAsMulti' | 'asMulti' | 'asMultiThreshold1'

  const transactionType: Approve = useMemo(() => {
    if (!readyToExecute) return 'approveAsMulti'
    return team.threshold === 1 ? 'asMultiThreshold1' : 'asMulti'
  }, [readyToExecute, team.threshold])

  const approveData: Record<Approve, { isReady: boolean; estimatedFee: MultisigBalance | undefined }> = useMemo(
    () => ({
      approveAsMulti: {
        isReady: !!approveReady,
        estimatedFee: approveFee,
      },
      asMulti: {
        isReady: !!asMultiReady,
        estimatedFee: asMultiFee,
      },
      asMultiThreshold1: {
        isReady: !!asMultiThreshold1Ready,
        estimatedFee: asMultiThreshold1Fee,
      },
    }),
    [approveFee, approveReady, asMultiFee, asMultiReady, asMultiThreshold1Fee, asMultiThreshold1Ready]
  )

  const { isReady, estimatedFee } = approveData[transactionType]

  const approve = useCallback(async () => {
    return await new Promise<{ result: SubmittableResult; executed: boolean }>((resolve, reject) => {
      if (!t?.callData) return reject(new Error('No call data'))
      if (!isReady) {
        console.error(`attempt to call ${transactionType} before it's ready`)
        return reject(new Error('Please try again later.'))
      }
      setApproving(true)

      const handleSuccess = (r: SubmittableResult) => {
        setApproving(false)
        resolve({ result: r, executed: false })
      }
      const handleFailure = (e: string) => {
        setApproving(false)
        reject(e)
      }

      switch (transactionType) {
        // Approve tx if not ready to execute
        case 'approveAsMulti':
          approveAsMulti({
            saveMetadata: !t.metadataSaved,
            metadata: {
              description: t?.description,
              callData: t.callData,
              ...otherTxMetadata,
            },
            onSuccess: r => handleSuccess(r),
            onFailure: e => handleFailure(e),
          })
          break
        // Execute tx as multisig if ready to execute
        case 'asMulti':
          asMulti({
            onSuccess: r => handleSuccess(r),
            onFailure: e => handleFailure(e),
          })
          break
        // Approve & execute tx as multisig of One if ready to execute and threshold is 1
        case 'asMultiThreshold1':
          asMultiThreshold1({
            onSuccess: r => handleSuccess(r),
            onFailure: e => handleFailure(e),
          })
          break
      }
    })
  }, [
    approveAsMulti,
    asMulti,
    asMultiThreshold1,
    isReady,
    otherTxMetadata,
    t?.callData,
    t?.description,
    t?.metadataSaved,
    transactionType,
  ])

  return {
    innerExtrinsic,
    proxyExtrinsic,
    hash,
    approving,
    approve,
    t,
    estimatedFee,
    ready: isReady,
    readyToExecute,
  }
}

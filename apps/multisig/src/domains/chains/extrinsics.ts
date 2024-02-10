// Abstracting extrinsic calls into these hooks which will reuse pjs API instances (per network).
// When CAPI is ready, the internals of these hooks can be replaced without needing to make many
// changes in other areas of the codebase.
// TODO: refactor code to remove repititon

import { pjsApiSelector, useApi } from '@domains/chains/pjs-api'
import { accountsState } from '@domains/extension'
import { Balance, Multisig, Transaction, useSelectedMultisig } from '@domains/multisig'
import { ApiPromise, SubmittableResult } from '@polkadot/api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import { web3FromAddress } from '@polkadot/extension-dapp'
import type { Call, ExtrinsicPayload, Timepoint } from '@polkadot/types/interfaces'
import { assert, compactToU8a, u8aConcat, u8aEq } from '@polkadot/util'
import { Address } from '@util/addresses'
import { getErrorString, makeTransactionID } from '@util/misc'
import BN from 'bn.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRecoilValue, useRecoilValueLoadable, useSetRecoilState } from 'recoil'

import { rawPendingTransactionsDependency } from './storage-getters'
import { Chain, isSubstrateAssetsToken, isSubstrateNativeToken, isSubstrateTokensToken, tokenByIdQuery } from './tokens'
import { TxMetadata, useInsertTxMetadata } from '../offchain-data/metadata'
import { captureException } from '@sentry/react'
import { handleSubmittableResultError } from '@util/errors'
import { useAddSmartContract } from '@domains/offchain-data'

export type ExecuteCallbacks = {
  onSuccess: (result: SubmittableResult) => void
  onFailure: (message: string) => void
}

export const buildTransferExtrinsic = (api: ApiPromise, to: Address, balance: Balance) => {
  if (isSubstrateNativeToken(balance.token)) {
    if (!api.tx.balances?.transferKeepAlive) {
      throw Error('trying to send chain missing balances pallet')
    }
    return api.tx.balances.transferKeepAlive(to.bytes, balance.amount)
  } else if (isSubstrateAssetsToken(balance.token)) {
    if (!api.tx.assets?.transferKeepAlive) {
      throw Error('trying to send chain missing assets pallet')
    }
    return api.tx.assets.transferKeepAlive(balance.token.assetId, to.bytes, balance.amount)
  } else if (isSubstrateTokensToken(balance.token)) {
    if (!api.tx.tokens?.transferKeepAlive) {
      throw Error('trying to send chain missing tokens pallet')
    }
    // tokens requires a string for address not bytes
    return api.tx.tokens.transferKeepAlive(to.bytes, balance.token.onChainId, balance.amount)
  } else {
    throw Error('unknown token type!')
  }
}

// Copied from p.js apps because it's not exported in any public packages.
// Full credit to the p.js team.
// Original code: https://github.com/polkadot-js/apps/blob/b6923ea003e1b043f22d3beaa685847c2bc54c24/packages/page-extrinsics/src/Decoder.tsx#L55
// Inherits Apache-2.0 license.
export const decodeCallData = (api: ApiPromise, callData: string) => {
  try {
    let extrinsicCall: Call
    let extrinsicPayload: ExtrinsicPayload | null = null
    let decoded: SubmittableExtrinsic<'promise'> | null = null

    try {
      // cater for an extrinsic input
      const tx = api.tx(callData)

      // ensure that the full data matches here
      if (tx.toHex() !== callData) {
        throw new Error('Cannot decode data as extrinsic, length mismatch')
      }

      decoded = tx
      extrinsicCall = api.createType('Call', decoded.method)
    } catch {
      try {
        // attempt to decode as Call
        extrinsicCall = api.createType('Call', callData)

        const callHex = extrinsicCall.toHex()

        if (callHex === callData) {
          // all good, we have a call
        } else if (callData.startsWith(callHex)) {
          // this could be an un-prefixed payload...
          const prefixed = u8aConcat(compactToU8a(extrinsicCall.encodedLength), callData)

          extrinsicPayload = api.createType('ExtrinsicPayload', prefixed)

          assert(u8aEq(extrinsicPayload.toU8a(), prefixed), 'Unable to decode data as un-prefixed ExtrinsicPayload')

          extrinsicCall = api.createType('Call', extrinsicPayload.method.toHex())
        } else {
          throw new Error('Unable to decode data as Call, length mismatch in supplied data')
        }
      } catch {
        // final attempt, we try this as-is as a (prefixed) payload
        extrinsicPayload = api.createType('ExtrinsicPayload', callData)

        assert(
          extrinsicPayload.toHex() === callData,
          'Unable to decode input data as Call, Extrinsic or ExtrinsicPayload'
        )

        extrinsicCall = api.createType('Call', extrinsicPayload.method.toHex())
      }
    }

    if (!decoded) {
      const { method, section } = api.registry.findMetaCall(extrinsicCall.callIndex)
      // @ts-ignore
      const extrinsicFn = api.tx[section][method] as any
      decoded = extrinsicFn(...extrinsicCall.args)

      if (!decoded) throw Error('Unable to decode extrinsic')
      return decoded
    }

    throw Error('unable to decode')
  } catch (e) {
    throw e
  }
}

export const useCancelAsMulti = (tx?: Transaction) => {
  const extensionAddresses = useRecoilValue(accountsState)
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(tx?.multisig.chain.rpcs || []))
  const nativeToken = useRecoilValueLoadable(tokenByIdQuery(tx?.multisig.chain.nativeToken.id))
  const setRawPendingTransactionDependency = useSetRecoilState(rawPendingTransactionsDependency)
  const [estimatedFee, setEstimatedFee] = useState<Balance | undefined>()

  // Only the original signer can cancel
  const depositorAddress: Address | undefined = useMemo(() => {
    const depositorAddressString = tx?.rawPending?.onChainMultisig.depositor.toString()
    if (!depositorAddressString) return undefined
    const depositorAddress = Address.fromSs58(depositorAddressString)
    if (!depositorAddress) throw Error('rawPending multisig depositor is not valid ss52')
    return depositorAddress
  }, [tx?.rawPending?.onChainMultisig.depositor])

  const loading = apiLoadable.state === 'loading' || nativeToken.state === 'loading' || !tx || !depositorAddress
  const canCancel = useMemo(() => {
    if (!depositorAddress) return false

    if (extensionAddresses.some(a => a.address.isEqual(depositorAddress))) return true
    return false
  }, [extensionAddresses, depositorAddress])

  // Creates cancel extrinsic
  const createExtrinsic = useCallback(async (): Promise<SubmittableExtrinsic<'promise'> | undefined> => {
    if (loading) return
    if (!tx.rawPending) throw Error('Missing expected pendingData!')

    const api = apiLoadable.contents
    if (!api.tx.multisig?.cancelAsMulti) {
      throw new Error('chain missing multisig pallet')
    }

    return api.tx.multisig.cancelAsMulti(
      tx.multisig.threshold,
      Address.sortAddresses(tx.multisig.signers)
        .filter(s => !s.isEqual(depositorAddress))
        .map(s => s.bytes),
      tx.rawPending.onChainMultisig.when,
      tx.hash
    )
  }, [apiLoadable, tx, loading, depositorAddress])

  const estimateFee = useCallback(async () => {
    const extrinsic = await createExtrinsic()
    if (!extrinsic || !depositorAddress || !tx) return

    // Fee estimation
    const paymentInfo = await extrinsic.paymentInfo(depositorAddress.toSs58(tx.multisig.chain))
    setEstimatedFee({ token: nativeToken.contents, amount: paymentInfo.partialFee as unknown as BN })
  }, [depositorAddress, nativeToken, createExtrinsic, tx])

  // Estimate the fee as soon as the hook is used and the extensionAddress or apiLoadable changes
  useEffect(() => {
    estimateFee()
  }, [estimateFee])

  const cancelAsMulti = useCallback(
    async ({ onSuccess, onFailure }: ExecuteCallbacks) => {
      const extrinsic = await createExtrinsic()
      if (loading || !extrinsic || !depositorAddress || !canCancel) {
        console.error('tried to call cancelAsMulti before it was ready')
        return onFailure('Please try again.')
      }

      const { signer } = await web3FromAddress(depositorAddress.toSs58(tx.multisig.chain))
      const unsubscribe = await extrinsic
        .signAndSend(depositorAddress.toSs58(tx.multisig.chain), { signer }, result => {
          try {
            handleSubmittableResultError(result)
            if (!result?.status?.isFinalized) return

            // find event that indicates successful extrinsic
            result.events.forEach(({ event: { method } }): void => {
              if (method === 'ExtrinsicSuccess') {
                setRawPendingTransactionDependency(new Date())
                onSuccess(result)
              }
            })
          } catch (e) {
            if (unsubscribe) unsubscribe()
            captureException(e)
            console.error('Error in cancelAsMulti', e)
            onFailure(getErrorString(e))
          }
        })
        .catch(e => {
          console.error('Error in cancelAsMulti', e)
          if ((e as any).message !== 'Cancelled') captureException(e)
          onFailure(getErrorString(e))
        })
    },
    [depositorAddress, createExtrinsic, loading, setRawPendingTransactionDependency, canCancel, tx?.multisig.chain]
  )

  return { cancelAsMulti, ready: !loading && !!estimatedFee, estimatedFee, canCancel }
}

export const useAsMulti = (extensionAddress: Address | undefined, t?: Transaction) => {
  const [selectedMultisig] = useSelectedMultisig()
  const multisig = useMemo(() => t?.multisig ?? selectedMultisig, [selectedMultisig, t?.multisig])
  const { api } = useApi(multisig.chain.rpcs)
  const nativeToken = useRecoilValueLoadable(tokenByIdQuery(multisig.chain.nativeToken.id))
  const setRawPendingTransactionDependency = useSetRecoilState(rawPendingTransactionsDependency)
  const [estimatedFee, setEstimatedFee] = useState<Balance | undefined>()
  const { addContract } = useAddSmartContract()

  const extrinsic = useMemo(() => {
    if (!api || !t?.callData) return undefined
    return decodeCallData(api, t.callData)
  }, [api, t?.callData])

  const timepoint = useMemo(() => t?.rawPending?.onChainMultisig.when, [t?.rawPending?.onChainMultisig.when])
  const ready = useMemo(
    () => !!api && extensionAddress && !!extrinsic && nativeToken.state === 'hasValue' && timepoint !== undefined,
    [api, extensionAddress, extrinsic, nativeToken.state, timepoint]
  )

  // Creates some tx from calldata
  const createExtrinsic = useCallback(async () => {
    if (!ready || !api || !extrinsic || !extensionAddress || timepoint === undefined) return

    if (!api.tx.multisig?.asMulti) throw new Error('chain missing multisig pallet')

    const weightEstimation = (await extrinsic.paymentInfo(extensionAddress.toSs58(multisig.chain))).weight as any

    // Provide some buffer for the weight
    const weight = api.createType('Weight', {
      refTime: api.createType('Compact<u64>', Math.ceil(weightEstimation.refTime * 1.1)),
      proofSize: api.createType('Compact<u64>', Math.ceil(weightEstimation.proofSize * 1.1)),
    })

    return api.tx.multisig.asMulti(
      multisig.threshold,
      Address.sortAddresses(multisig.signers)
        .filter(s => s && !s.isEqual(extensionAddress))
        .map(s => s.bytes),
      timepoint,
      extrinsic.method.toHex(),
      weight
    )
  }, [api, extensionAddress, extrinsic, multisig.chain, multisig.signers, multisig.threshold, ready, timepoint])

  const estimateFee = useCallback(async () => {
    const extrinsic = await createExtrinsic()
    if (!extrinsic || !extensionAddress) return

    // Fee estimation
    const paymentInfo = await extrinsic.paymentInfo(extensionAddress.toSs58(multisig.chain))
    setEstimatedFee({ token: nativeToken.contents, amount: paymentInfo.partialFee as unknown as BN })
  }, [extensionAddress, nativeToken, createExtrinsic, multisig.chain])

  // Estimate the fee as soon as the hook is used and the extensionAddress or apiLoadable changes
  useEffect(() => {
    estimateFee()
  }, [estimateFee])

  const asMulti = useCallback(
    async ({ onSuccess, onFailure }: ExecuteCallbacks) => {
      const extrinsic = await createExtrinsic()
      if (!extrinsic || !extensionAddress) {
        console.error('tried to call approveAsMulti before it was ready')
        return onFailure('Please try again.')
      }

      const { signer } = await web3FromAddress(extensionAddress.toSs58(multisig.chain))
      const unsubscribe = await extrinsic
        .signAndSend(extensionAddress.toSs58(multisig.chain), { signer }, result => {
          try {
            handleSubmittableResultError(result)

            const instantiatedEvent = result.events.find(
              ({ event: { method, section, data } }) =>
                method === 'Instantiated' && section === 'contracts' && !!(data as any).contract
            )
            if (result.status.isInBlock && instantiatedEvent && t?.decoded?.contractDeployment) {
              const contractAddressString = (instantiatedEvent.event.data as any).contract.toString() as string
              const address = Address.fromSs58(contractAddressString)
              if (!address) {
                console.error(result.toHuman())
                throw new Error(
                  'Invalid contract address returned! Please check console for more details or submit a bug report.'
                )
              }

              addContract(
                address,
                t.decoded.contractDeployment.name,
                t.multisig.id,
                t.decoded.contractDeployment.abi,
                JSON.stringify(t.decoded.contractDeployment.abi.json)
              ).then(() => console.log(`Contract ${t.decoded?.contractDeployment?.name} saved!`))
            }

            if (!result?.status?.isFinalized) return

            result.events.forEach(({ event: { section, method } }): void => {
              if (section === 'system' && method === 'ExtrinsicSuccess') {
                setRawPendingTransactionDependency(new Date())
                onSuccess(result)
              }
            })
          } catch (e) {
            if (unsubscribe) unsubscribe()
            captureException(e)
            console.error('Error in asMulti', e)
            onFailure(getErrorString(e))
          }
        })
        .catch(e => {
          console.error('Error in asMulti', e)
          if ((e as any).message !== 'Cancelled') captureException(e)
          onFailure(getErrorString(e))
        })
    },
    [createExtrinsic, extensionAddress, multisig.chain, t, addContract, setRawPendingTransactionDependency]
  )

  return { asMulti, ready: ready && !!estimatedFee, estimatedFee }
}

export const useApproveAsMulti = (
  extensionAddress: Address | undefined,
  hash: `0x${string}` | undefined,
  timepoint: Timepoint | null | undefined,
  multisig: Multisig | undefined
) => {
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(multisig?.chain.rpcs || []))
  const nativeToken = useRecoilValueLoadable(tokenByIdQuery(multisig?.chain.nativeToken.id || null))
  const setRawPendingTransactionDependency = useSetRecoilState(rawPendingTransactionsDependency)
  const insertTxMetadata = useInsertTxMetadata()
  const [estimatedFee, setEstimatedFee] = useState<Balance | undefined>()

  const ready =
    apiLoadable.state === 'hasValue' &&
    extensionAddress &&
    nativeToken.state === 'hasValue' &&
    !!hash &&
    timepoint !== undefined &&
    multisig !== undefined

  // Creates some tx from callhash
  const createExtrinsic = useCallback(async () => {
    if (!ready) return

    const api = apiLoadable.contents
    if (!api.tx.multisig?.approveAsMulti) {
      throw new Error('chain missing multisig pallet')
    }

    // Weight of approveAsMulti is a noop -- only matters when we execute the tx with asMulti.
    const weight = api.createType('Weight', {
      refTime: api.createType('Compact<u64>', 0),
      proofSize: api.createType('Compact<u64>', 0),
    })
    return api.tx.multisig.approveAsMulti(
      multisig.threshold,
      Address.sortAddresses(multisig.signers)
        .filter(s => !s.isEqual(extensionAddress))
        .map(s => s.bytes),
      timepoint,
      hash,
      weight
    )
  }, [apiLoadable, extensionAddress, hash, multisig, ready, timepoint])

  const estimateFee = useCallback(async () => {
    const extrinsic = await createExtrinsic()
    if (!extrinsic || !extensionAddress || !multisig) return

    // Fee estimation
    const paymentInfo = await extrinsic.paymentInfo(extensionAddress.toSs58(multisig.chain))
    setEstimatedFee({ token: nativeToken.contents, amount: paymentInfo.partialFee as unknown as BN })
  }, [extensionAddress, nativeToken, createExtrinsic, multisig])

  // Estimate the fee as soon as the hook is used and the extensionAddress or apiLoadable changes
  useEffect(() => {
    estimateFee()
  }, [estimateFee])

  const approveAsMulti = useCallback(
    async ({
      onSuccess,
      onFailure,
      metadata,
      saveMetadata = true,
    }: ExecuteCallbacks & {
      metadata?: Pick<TxMetadata, 'changeConfigDetails' | 'contractDeployed' | 'callData' | 'description'>
      saveMetadata?: boolean
    }) => {
      const extrinsic = await createExtrinsic()
      if (!extrinsic || !extensionAddress || !hash || !multisig) {
        console.error('tried to call approveAsMulti before it was ready')
        return onFailure('Please try again.')
      }

      const { signer } = await web3FromAddress(extensionAddress.toSs58(multisig.chain))
      let savedMetadata = false
      const unsubscribe = await extrinsic
        .signAndSend(extensionAddress.toSs58(multisig.chain), { signer }, result => {
          try {
            handleSubmittableResultError(result)

            // make a reusable fn that will save metadata
            // 1. try to save as soon as tx is included in block
            // 2. when tx is finalized, if tx isn't saved, we try to save again
            const saveMetadataFn = () => {
              if (metadata && saveMetadata) {
                const timepointHeight = (result as any).blockNumber.toNumber() as number
                const timepointIndex = result.txIndex as number
                const extrinsicId = makeTransactionID(multisig.chain, timepointHeight, timepointIndex)

                savedMetadata = true
                insertTxMetadata(multisig, {
                  ...metadata,
                  hash,
                  timepointHeight,
                  timepointIndex,
                  extrinsicId,
                })
              }
            }

            const hasSuccessEvent = result.events.some(({ event: { method } }) => method === 'ExtrinsicSuccess')

            // save metadata early as soon as tx is included in block
            if (result.isInBlock && hasSuccessEvent) saveMetadataFn()

            // remaining logic should only be triggered upon finalization
            if (!result?.status?.isFinalized) return

            // handleSubmittableResultError should've captured the error, unless the blockchain has bad error handling
            if (!hasSuccessEvent) throw new Error('Transaction completed without success event!')

            // try to save again if for whatever reason isInBlock was never true and skipped to finalized
            if (!savedMetadata) saveMetadataFn()

            // refresh pending transaction list
            setRawPendingTransactionDependency(new Date())
            onSuccess(result)
          } catch (e) {
            if (unsubscribe) unsubscribe()
            captureException(e)
            console.error('Error in asMulti', e)
            onFailure(getErrorString(e))
          }
        })
        .catch(e => {
          console.error('Error in approveAsMulti', e)
          if ((e as any).message !== 'Cancelled') captureException(e)
          onFailure(getErrorString(e))
        })
    },
    [createExtrinsic, extensionAddress, hash, multisig, setRawPendingTransactionDependency, insertTxMetadata]
  )

  return { approveAsMulti, ready: ready && !!estimatedFee, estimatedFee }
}

export const useCreateProxy = (chain: Chain, extensionAddress: Address | undefined) => {
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(chain.rpcs))
  const nativeToken = useRecoilValueLoadable(tokenByIdQuery(chain.nativeToken.id))
  const setRawPendingTransactionDependency = useSetRecoilState(rawPendingTransactionsDependency)
  const [estimatedFee, setEstimatedFee] = useState<Balance | undefined>()

  const createTx = useCallback(async () => {
    if (apiLoadable.state !== 'hasValue' || !extensionAddress) {
      return
    }

    const api = apiLoadable.contents
    if (!api.tx.proxy?.createPure) {
      throw new Error('chain missing balances or utility or proxy pallet')
    }
    return api.tx.proxy.createPure('Any', 0, 0)
  }, [apiLoadable, extensionAddress])

  const estimateFee = useCallback(async () => {
    const tx = await createTx()
    if (!tx || !extensionAddress || nativeToken.state !== 'hasValue') return

    // Fee estimation
    const paymentInfo = await tx.paymentInfo(extensionAddress.toSs58(chain))
    setEstimatedFee({ token: nativeToken.contents, amount: paymentInfo.partialFee as unknown as BN })
  }, [extensionAddress, createTx, nativeToken, chain])

  // Estimate the fee as soon as the hook is used and the extensionAddress or apiLoadable changes
  useEffect(() => {
    estimateFee()
  }, [estimateFee])

  const createProxy = useCallback(
    async ({
      onSuccess,
      onFailure,
    }: {
      onSuccess: (proxyAddress: Address) => void
      onFailure: (message: string) => void
    }) => {
      const tx = await createTx()
      if (!tx || !extensionAddress) return

      const { signer } = await web3FromAddress(extensionAddress.toSs58(chain))

      const unsubscribe = await tx
        .signAndSend(extensionAddress.toSs58(chain), { signer }, result => {
          try {
            handleSubmittableResultError(result)
            if (!result?.status?.isFinalized) return

            result.events.forEach(({ event }): void => {
              const { method, data, section } = event

              if (section === 'proxy' && method === 'PureCreated') {
                if (data[0]) {
                  const pureStr = data[0].toString()
                  const pure = Address.fromSs58(pureStr)
                  if (!pure) throw Error(`chain returned invalid address ${pureStr}`)
                  setRawPendingTransactionDependency(new Date())
                  onSuccess(pure)
                } else {
                  throw new Error('No proxies exist')
                }
              }
            })
          } catch (e) {
            if (unsubscribe) unsubscribe()
            captureException(e)
            console.error('Error in createProxy', e)
            onFailure(getErrorString(e))
          }
        })
        .catch(e => {
          console.error('Error in createProxy', e)
          if ((e as any).message !== 'Cancelled') captureException(e)
          onFailure(getErrorString(e))
        })
    },
    [createTx, extensionAddress, chain, setRawPendingTransactionDependency]
  )

  return { createProxy, ready: apiLoadable.state === 'hasValue' && !!estimatedFee, estimatedFee }
}

/**
 * Given a proxied addrss, transfer the proxied address to the multisig and deposit some funds into the proxied address
 * @param chain
 * @returns
 */
export const useTransferProxyToMultisig = (chain: Chain) => {
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(chain.rpcs))

  const transferProxyToMultisig = useCallback(
    async (
      extensionAddress: Address | undefined,
      proxyAddress: Address,
      multisigAddress: Address,
      existentialDeposit: Balance,
      onSuccess: (r: SubmittableResult) => void,
      onFailure: (message: string) => void
    ) => {
      if (apiLoadable.state !== 'hasValue' || !extensionAddress) {
        return
      }

      const api = apiLoadable.contents
      const { signer } = await web3FromAddress(extensionAddress.toSs58(chain))

      if (
        !api.tx.balances?.transferKeepAlive ||
        !api.tx.utility?.batchAll ||
        !api.tx.proxy?.proxy ||
        !api.tx.proxy?.addProxy ||
        !api.tx.proxy?.removeProxy
      ) {
        throw new Error('chain missing balances or utility or proxy pallet')
      }

      // Define the inner batch call
      const proxyBatchCall = api.tx.utility.batchAll([
        api.tx.proxy.addProxy(multisigAddress.bytes, 'Any', 0),
        api.tx.proxy.removeProxy(extensionAddress.bytes, 'Any', 0),
      ])

      // Define the inner proxy call
      const proxyCall = api.tx.proxy.proxy(proxyAddress.bytes, null, proxyBatchCall)

      // Define the outer batch call
      const signerBatchCall = api?.tx?.utility?.batchAll([
        api.tx.balances.transferKeepAlive(proxyAddress.bytes, getInitialProxyBalance(existentialDeposit).amount),
        proxyCall,
      ])

      // Send the batch call
      const unsubscribe = await signerBatchCall
        .signAndSend(extensionAddress.toSs58(chain), { signer }, result => {
          try {
            handleSubmittableResultError(result)
            if (!result?.status?.isFinalized) return

            result.events.forEach(({ event }): void => {
              if (event.section === 'system' && event.method === 'ExtrinsicSuccess') onSuccess(result)
            })
          } catch (e) {
            if (unsubscribe) unsubscribe()
            console.error('Failed to deposit and transfer pure proxy to multisig:', e)
            captureException(e)
            onFailure(getErrorString(e))
          }
        })
        .catch(e => {
          console.error('Failed to deposit and transfer pure proxy to multisig:', e)
          if ((e as any).message !== 'Cancelled') captureException(e)
          onFailure(getErrorString(e))
        })
    },
    [apiLoadable, chain]
  )

  return { transferProxyToMultisig, ready: apiLoadable.state === 'hasValue' }
}

// Add 1 whole token onto the ED to make sure there're no weird issues creating the multisig
// TODO: Look into how to compute an exact initial balance.
export const getInitialProxyBalance = (ed: Balance) => ({
  token: ed.token,
  amount: ed.amount.add(new BN(10).pow(new BN(ed.token.decimals))),
})

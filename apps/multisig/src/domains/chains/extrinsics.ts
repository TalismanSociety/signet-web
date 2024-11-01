// Abstracting extrinsic calls into these hooks which will reuse pjs API instances (per network).
// When CAPI is ready, the internals of these hooks can be replaced without needing to make many
// changes in other areas of the codebase.
// TODO: refactor code to remove repititon
import { RuntimeDispatchInfo } from '@polkadot/types/interfaces'
import { customExtensions, pjsApiSelector, useApi } from '@domains/chains/pjs-api'
import { isNumber } from '@polkadot/util'
import { InjectedMetadata } from '@polkadot/extension-inject/types'
import { accountsState } from '@domains/extension'
import { Multisig, useSelectedMultisig } from '@domains/multisig'
import { Balance, Transaction } from '@domains/offchain-data/metadata/types'
import { ApiPromise, SubmittableResult } from '@polkadot/api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import { web3FromAddress } from '@polkadot/extension-dapp'
import type { Call, ExtrinsicPayload, Timepoint } from '@polkadot/types/interfaces'
import { assert, compactToU8a, u8aConcat, u8aEq } from '@polkadot/util'
import { Address } from '@util/addresses'
import { getErrorString, makeTransactionID } from '@util/misc'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loadable, useRecoilValue, useRecoilValueLoadable, useSetRecoilState } from 'recoil'
import { BN } from '@polkadot/util'

import {
  BaseToken,
  Chain,
  isSubstrateAssetsToken,
  isSubstrateNativeToken,
  isSubstrateTokensToken,
  tokenByIdQuery,
} from './tokens'
import { TxMetadata } from '@domains/offchain-data/metadata/types'
import { useInsertTxMetadata } from '../offchain-data/metadata'
import { captureException } from '@sentry/react'
import { handleSubmittableResultError } from '@util/errors'
import { useAddSmartContract } from '@domains/offchain-data'
import { rawPendingTransactionsDependency } from './storage-getters'
import { supportedChains } from './generated-chains'

export type ExecuteCallbacks = {
  onSuccess: (result: SubmittableResult) => void
  onFailure: (message: string) => void
}

export const buildTransferExtrinsic = (
  api: ApiPromise,
  to: Address,
  balance: Balance,
  vestingSchedule?: any | null
) => {
  if (vestingSchedule) {
    if (!api.tx.vesting?.vestedTransfer) {
      throw Error('trying to send chain missing vesting pallet')
    }
    return api.tx.vesting.vestedTransfer(to.bytes, vestingSchedule)
  } else if (isSubstrateNativeToken(balance.token)) {
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
  let extrinsicCall: Call
  let extrinsicPayload: ExtrinsicPayload | null = null

  try {
    // cater for an extrinsic input
    const tx = api.tx(callData)

    // ensure that the full data matches here
    if (tx.toHex() !== callData) throw new Error('Cannot decode data as extrinsic, length mismatch')

    // tx decoded correctly
    return tx
  } catch {
    try {
      // attempt to decode as Call
      extrinsicCall = api.createType('Call', callData)
      const callHex = extrinsicCall.toHex()

      if (callHex === callData) {
        // all good, we have a call
        return api.tx(extrinsicCall)
      } else if (callData.startsWith(callHex)) {
        // this could be an un-prefixed payload...
        const prefixed = u8aConcat(compactToU8a(extrinsicCall.encodedLength), callData)
        extrinsicPayload = api.createType('ExtrinsicPayload', prefixed)
        assert(u8aEq(extrinsicPayload.toU8a(), prefixed), 'Unable to decode data as un-prefixed ExtrinsicPayload')

        extrinsicCall = api.createType('Call', extrinsicPayload.method.toHex())
      } else {
        throw new Error('Unable to decode data as Call, length mismatch in supplied data')
      }
    } catch (e) {
      try {
        // final attempt, we try this as-is as a (prefixed) payload
        extrinsicPayload = api.createType('ExtrinsicPayload', callData)

        assert(
          extrinsicPayload.toHex() === callData,
          'Unable to decode input data as Call, Extrinsic or ExtrinsicPayload'
        )

        extrinsicCall = api.createType('Call', extrinsicPayload.method.toHex())
      } catch (e) {
        return undefined
      }
    }
  }

  const { method, section } = api.registry.findMetaCall(extrinsicCall.callIndex)
  // @ts-ignore
  const extrinsicFn = api.tx[section][method] as any
  const decoded = extrinsicFn(...extrinsicCall.args)

  if (!decoded) throw Error('Unable to decode extrinsic')
  return decoded
}

export const useEstimateFee = (
  extrinsic: SubmittableExtrinsic<'promise'> | undefined,
  extensionAddress: Address | undefined,
  nativeTokenLoadable?: Loadable<BaseToken | undefined>
) => {
  const [paymentInfo, setPaymentInfo] = useState<RuntimeDispatchInfo | undefined>()

  const estimateFee = useCallback(async () => {
    try {
      if (!extrinsic || !extensionAddress || paymentInfo) return
      const res = await extrinsic.paymentInfo(extensionAddress.toPubKey())
      setPaymentInfo(res)
    } catch (e) {
      console.error('Error in estimateFee', e)
    }
  }, [extrinsic, extensionAddress, paymentInfo])

  // Estimate the fee as soon as the hook is used and the extensionAddress or apiLoadable changes
  useEffect(() => {
    estimateFee()
  }, [estimateFee])

  // reset fee when extrinsic is changed
  useEffect(() => {
    setPaymentInfo(undefined)
  }, [extrinsic])

  const estimatedFee = useMemo(() => {
    if (!paymentInfo || nativeTokenLoadable?.state !== 'hasValue') return
    return { token: nativeTokenLoadable.contents, amount: paymentInfo.partialFee } as Balance
  }, [nativeTokenLoadable, paymentInfo])

  return { estimatedFee, paymentInfo }
}

const useInjectMetadata = (chainGenesisHash: string) => {
  const { api } = useApi(chainGenesisHash)
  const chain = useMemo(() => supportedChains.find(c => c.genesisHash === chainGenesisHash), [chainGenesisHash])

  const inject = useCallback(
    async (metadata: InjectedMetadata) => {
      if (!chain || !api) return
      const customExtension = customExtensions[chain.id]
      const curMetadata = await metadata.get()
      const specVersion = api.runtimeVersion.specVersion.toNumber()
      const genesisHash = api.genesisHash.toHex()
      const updated = curMetadata.find(m => m.genesisHash === genesisHash && m.specVersion === specVersion)
      if (customExtension && !updated) {
        await metadata.provide({
          chain: api.runtimeChain.toString(),
          genesisHash: api.genesisHash.toHex(),
          specVersion: api.runtimeVersion.specVersion.toNumber(),
          tokenDecimals: api.registry.chainDecimals[0] ?? 18,
          tokenSymbol: api.registry.chainTokens[0] ?? 'DOT',
          icon: chain.logo,
          ss58Format: isNumber(api.registry.chainSS58) ? api.registry.chainSS58 : 0,
          types: customExtension.types as any,

          userExtensions: customExtension.signedExtensions,
        })
      }
    },
    [api, chain]
  )

  return inject
}

export const useCancelAsMulti = (tx?: Transaction) => {
  const extensionAddresses = useRecoilValue(accountsState)
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(tx?.multisig.chain.genesisHash || ''))
  const nativeToken = useRecoilValueLoadable(tokenByIdQuery(tx?.multisig.chain.nativeToken.id))
  const setRawPendingTransactionDependency = useSetRecoilState(rawPendingTransactionsDependency)
  const injectMetadata = useInjectMetadata(tx?.multisig.chain.genesisHash ?? supportedChains[0]!.genesisHash)
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
  const extrinsic = useMemo(() => {
    if (loading || apiLoadable.state !== 'hasValue') return undefined
    if (!tx.rawPending) throw Error('Missing expected pendingData!')

    const api = apiLoadable.contents
    if (!api.tx.multisig?.cancelAsMulti) throw new Error('chain missing multisig pallet')

    return api.tx.multisig.cancelAsMulti(
      tx.multisig.threshold,
      Address.sortAddresses(tx.multisig.signers)
        .filter(s => !s.isEqual(depositorAddress))
        .map(s => s.bytes),
      tx.rawPending.onChainMultisig.when,
      tx.hash
    )
  }, [apiLoadable, tx, loading, depositorAddress])

  const { estimatedFee } = useEstimateFee(extrinsic, depositorAddress, nativeToken)

  const cancelAsMulti = useCallback(
    async ({ onSuccess, onFailure }: ExecuteCallbacks) => {
      if (loading || !extrinsic || !depositorAddress || !canCancel) {
        console.error('tried to call cancelAsMulti before it was ready')
        return onFailure('Please try again.')
      }

      const { signer, metadata } = await web3FromAddress(depositorAddress.toSs58(tx.multisig.chain))
      if (metadata) await injectMetadata(metadata)

      let completed = false
      const unsubscribe = await extrinsic
        .signAndSend(depositorAddress.toSs58(tx.multisig.chain), { signer }, result => {
          try {
            handleSubmittableResultError(result)
            const hasSuccessEvent = result.events.some(({ event: { method } }) => method === 'ExtrinsicSuccess')
            if ((result.status.isInBlock || result.status.isFinalized) && hasSuccessEvent && !completed) {
              completed = true
              setRawPendingTransactionDependency(new Date())
              onSuccess(result)
            }
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
    [
      loading,
      extrinsic,
      depositorAddress,
      canCancel,
      tx?.multisig.chain,
      injectMetadata,
      setRawPendingTransactionDependency,
    ]
  )

  return {
    cancelAsMulti,
    ready: !loading && !!estimatedFee,
    estimatedFee,
    canCancel,
  }
}

export const useAsMulti = (extensionAddress: Address | undefined, t?: Transaction) => {
  const [selectedMultisig] = useSelectedMultisig()
  const multisig = useMemo(() => t?.multisig ?? selectedMultisig, [selectedMultisig, t?.multisig])
  const { api } = useApi(multisig.chain.genesisHash)
  const nativeToken = useRecoilValueLoadable(tokenByIdQuery(multisig.chain.nativeToken.id))
  const setRawPendingTransactionDependency = useSetRecoilState(rawPendingTransactionsDependency)
  const { addContract } = useAddSmartContract()
  const injectMetadata = useInjectMetadata(multisig?.chain.genesisHash ?? supportedChains[0]!.genesisHash)

  const extrinsic = useMemo(() => {
    if (!api || !t?.callData) return undefined
    return decodeCallData(api, t.callData)
  }, [api, t?.callData])

  const timepoint = useMemo(() => t?.rawPending?.onChainMultisig.when, [t?.rawPending?.onChainMultisig.when])
  const ready = useMemo(
    () => !!api && extensionAddress && !!extrinsic && nativeToken.state === 'hasValue' && timepoint !== undefined,
    [api, extensionAddress, extrinsic, nativeToken.state, timepoint]
  )
  const { paymentInfo } = useEstimateFee(extrinsic, extensionAddress)

  // Creates some tx from calldata
  const asMultiExtrinsic = useMemo(() => {
    if (!ready || !api || !extrinsic || !extensionAddress || timepoint === undefined || !paymentInfo) return

    if (!api.tx.multisig?.asMulti) throw new Error('chain missing multisig pallet')

    // Provide some buffer for the weight
    const weight = api.createType('Weight', {
      refTime: api.createType('Compact<u64>', Math.ceil(paymentInfo.weight.refTime.toNumber() * 1.1)),
      proofSize: api.createType('Compact<u64>', Math.ceil(paymentInfo.weight.proofSize.toNumber() * 1.1)),
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
  }, [api, extensionAddress, extrinsic, multisig.signers, multisig.threshold, paymentInfo, ready, timepoint])

  const { estimatedFee } = useEstimateFee(asMultiExtrinsic, extensionAddress, nativeToken)

  const asMulti = useCallback(
    async ({ onSuccess, onFailure }: ExecuteCallbacks) => {
      if (!asMultiExtrinsic || !extensionAddress) {
        console.error('tried to call approveAsMulti before it was ready')
        return onFailure('Please try again.')
      }

      let completed = false
      const { signer, metadata } = await web3FromAddress(extensionAddress.toSs58(multisig.chain))
      if (metadata) await injectMetadata(metadata)

      const unsubscribe = await asMultiExtrinsic
        .signAndSend(extensionAddress.toSs58(multisig.chain), { signer }, result => {
          try {
            handleSubmittableResultError(result)
            const hasSuccessEvent = result.events.some(
              ({ event: { section, method } }) => section === 'system' && method === 'ExtrinsicSuccess'
            )

            if ((result.status.isInBlock || result.status.isFinalized) && hasSuccessEvent && !completed) {
              completed = true
              if (t?.decoded?.contractDeployment) {
                // find the event that tells us that the contract has been initiated
                const instantiatedEvent = result.events.find(
                  ({ event: { method, section, data } }) =>
                    method === 'Instantiated' && section === 'contracts' && !!(data as any).contract
                )
                if (!instantiatedEvent)
                  throw new Error('Could not save contract, failed to retrieve contract instantiated event')

                // save contract to backend
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

              // inform UI that contract has been created
              onSuccess(result)
              setRawPendingTransactionDependency(new Date())
            }
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
    [
      asMultiExtrinsic,
      extensionAddress,
      multisig.chain,
      injectMetadata,
      t?.decoded?.contractDeployment,
      t?.multisig.id,
      setRawPendingTransactionDependency,
      addContract,
    ]
  )

  return { asMulti, ready: ready && !!estimatedFee, estimatedFee }
}

export const useAsMultiThreshold1 = (
  extensionAddress: Address | undefined,
  hash: `0x${string}` | undefined,
  t?: Transaction
) => {
  const [estimatedFee, setEstimatedFee] = useState<Balance | undefined>()
  const [selectedMultisig] = useSelectedMultisig()
  const multisig = useMemo(() => t?.multisig ?? selectedMultisig, [selectedMultisig, t?.multisig])
  const { api } = useApi(multisig.chain.genesisHash)
  const insertTxMetadata = useInsertTxMetadata()
  const { addContract } = useAddSmartContract()
  const injectMetadata = useInjectMetadata(multisig?.chain.genesisHash ?? supportedChains[0]!.genesisHash)
  const nativeToken = useRecoilValueLoadable(tokenByIdQuery(multisig.chain.nativeToken.id))
  const setRawPendingTransactionDependency = useSetRecoilState(rawPendingTransactionsDependency)

  const innerExtrinsic = useMemo(() => {
    if (!api || !t?.callData) return undefined
    return decodeCallData(api, t.callData)
  }, [api, t?.callData])

  const ready = useMemo(
    () =>
      !!api &&
      extensionAddress &&
      !!innerExtrinsic &&
      nativeToken.state === 'hasValue' &&
      !!hash &&
      multisig !== undefined,
    [api, extensionAddress, innerExtrinsic, hash, multisig, nativeToken.state]
  )

  // Creates some tx from calldata
  const asMultiThreshold1Extrinsic = useMemo(() => {
    if (!ready || !api || !innerExtrinsic || !extensionAddress) return

    if (!api.tx.multisig?.asMultiThreshold1) throw new Error('chain missing multisig pallet')

    return api?.tx.multisig.asMultiThreshold1(
      Address.sortAddresses(multisig.signers)
        .filter(s => s && !s.isEqual(extensionAddress))
        .map(s => s.bytes),
      innerExtrinsic.method.toHex()
    )
  }, [api, extensionAddress, innerExtrinsic, multisig.signers, ready])

  const estimateFee = useCallback(async () => {
    if (!asMultiThreshold1Extrinsic || !extensionAddress) return

    // Fee estimation
    const paymentInfo = await asMultiThreshold1Extrinsic.paymentInfo(extensionAddress.toSs58(multisig.chain))
    setEstimatedFee({ token: nativeToken.contents, amount: paymentInfo.partialFee as unknown as BN })
  }, [extensionAddress, nativeToken, asMultiThreshold1Extrinsic, multisig.chain])

  // Estimate the fee as soon as the hook is used and the extensionAddress or apiLoadable changes
  useEffect(() => {
    estimateFee()
  }, [estimateFee])

  const asMultiThreshold1 = useCallback(
    async ({
      onSuccess,
      onFailure,
      metadata,
      saveMetadata = true,
    }: ExecuteCallbacks & {
      metadata?: Pick<TxMetadata, 'changeConfigDetails' | 'contractDeployed' | 'callData' | 'description'>
      saveMetadata?: boolean
    }) => {
      if (!asMultiThreshold1Extrinsic || !extensionAddress || !hash || !multisig) {
        console.error('tried to call asMultiThreshold1 before it was ready')
        return onFailure('Please try again.')
      }

      let savedContract = false
      let savedMetadata = false
      const { signer, metadata: extensionMetadata } = await web3FromAddress(extensionAddress.toSs58(multisig.chain))
      if (extensionMetadata) await injectMetadata(extensionMetadata)

      const unsubscribe = await asMultiThreshold1Extrinsic
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

            const hasSuccessEvent = result.events.some(
              ({ event: { section, method } }) => section === 'system' && method === 'ExtrinsicSuccess'
            )

            if ((result.status.isInBlock || result.status.isFinalized) && hasSuccessEvent) {
              if (!savedContract) {
                savedContract = true
                if (t?.decoded?.contractDeployment) {
                  // find the event that tells us that the contract has been initiated
                  const instantiatedEvent = result.events.find(
                    ({ event: { method, section, data } }) =>
                      method === 'Instantiated' && section === 'contracts' && !!(data as any).contract
                  )
                  if (!instantiatedEvent)
                    throw new Error('Could not save contract, failed to retrieve contract instantiated event')

                  // save contract to backend
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
              }

              if (!savedMetadata) {
                saveMetadataFn()
              }

              // inform UI that contract has been created
              onSuccess(result)
              setRawPendingTransactionDependency(new Date())
            }
          } catch (e) {
            if (unsubscribe) unsubscribe()
            captureException(e)
            console.error('Error in asMultiThreshold1', e)
            onFailure(getErrorString(e))
          }
        })
        .catch(e => {
          console.error('Error in asMultiThreshold1', e)
          if ((e as any).message !== 'Cancelled') captureException(e)
          onFailure(getErrorString(e))
        })
    },
    [
      asMultiThreshold1Extrinsic,
      extensionAddress,
      hash,
      multisig,
      injectMetadata,
      insertTxMetadata,
      setRawPendingTransactionDependency,
      t?.decoded?.contractDeployment,
      t?.multisig.id,
      addContract,
    ]
  )

  return { asMultiThreshold1, ready: ready && !!estimatedFee, estimatedFee }
}

export const useApproveAsMulti = (
  extensionAddress: Address | undefined,
  hash: `0x${string}` | undefined,
  timepoint: Timepoint | null | undefined,
  multisig: Multisig | undefined
) => {
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(multisig?.chain.genesisHash || ''))
  const nativeToken = useRecoilValueLoadable(tokenByIdQuery(multisig?.chain.nativeToken.id || null))
  const setRawPendingTransactionDependency = useSetRecoilState(rawPendingTransactionsDependency)
  const insertTxMetadata = useInsertTxMetadata()
  const injectMetadata = useInjectMetadata(multisig?.chain.genesisHash ?? supportedChains[0]!.genesisHash)

  const ready =
    apiLoadable.state === 'hasValue' &&
    extensionAddress &&
    nativeToken.state === 'hasValue' &&
    !!hash &&
    timepoint !== undefined &&
    multisig !== undefined

  // Creates some tx from callhash
  const extrinsic = useMemo(() => {
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

  const { estimatedFee } = useEstimateFee(extrinsic, extensionAddress, nativeToken)

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
      if (!extrinsic || !extensionAddress || !hash || !multisig) {
        console.error('tried to call approveAsMulti before it was ready')
        return onFailure('Please try again.')
      }

      const { signer, metadata: extensionMetadata } = await web3FromAddress(extensionAddress.toSs58(multisig.chain))
      if (extensionMetadata) await injectMetadata(extensionMetadata)

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
            if ((result.isInBlock || result.isFinalized) && hasSuccessEvent && !savedMetadata) {
              saveMetadataFn()
              setRawPendingTransactionDependency(new Date())
              onSuccess(result)
            }

            // handleSubmittableResultError should've captured the error, unless the blockchain has bad error handling
            if (result?.status?.isFinalized && !hasSuccessEvent)
              throw new Error('Transaction completed without success event!')
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
    [extrinsic, extensionAddress, hash, multisig, injectMetadata, insertTxMetadata, setRawPendingTransactionDependency]
  )

  return { approveAsMulti, ready: ready && !!estimatedFee, estimatedFee }
}

export const useCreateProxy = (chain: Chain, extensionAddress: Address | undefined) => {
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(chain.genesisHash))
  const nativeToken = useRecoilValueLoadable(tokenByIdQuery(chain.nativeToken.id))
  const injectMetadata = useInjectMetadata(chain.genesisHash)

  const extrinsic = useMemo(() => {
    if (apiLoadable.state !== 'hasValue' || !extensionAddress) {
      return
    }

    const api = apiLoadable.contents
    if (!api.tx.proxy?.createPure) {
      throw new Error('chain missing balances or utility or proxy pallet')
    }
    return api.tx.proxy.createPure('Any', 0, 0)
  }, [apiLoadable, extensionAddress])

  const { estimatedFee } = useEstimateFee(extrinsic, extensionAddress, nativeToken)

  const createProxy = useCallback(
    async ({
      onSuccess,
      onFailure,
    }: {
      onSuccess: (proxyAddress: Address) => void
      onFailure: (message: string) => void
    }) => {
      if (!extrinsic || !extensionAddress) return

      const { signer, metadata } = await web3FromAddress(extensionAddress.toSs58(chain))
      if (metadata) await injectMetadata(metadata)

      const unsubscribe = await extrinsic
        .signAndSend(extensionAddress.toSs58(chain), { signer }, result => {
          try {
            handleSubmittableResultError(result)
            // typically we wait for inclusion only but for create proxy we wait for finalization
            // so in case there is a chain reorg, users wouldn't have deposited into an account that doesn't exist
            if (result.status.isInBlock || result?.status?.isFinalized) {
              result.events.forEach(({ event }): void => {
                const { method, data, section } = event

                if (section === 'proxy' && method === 'PureCreated') {
                  if (data[0]) {
                    const pureStr = data[0].toString()
                    const pure = Address.fromSs58(pureStr)
                    if (!pure) throw Error(`chain returned invalid address ${pureStr}`)
                    onSuccess(pure)
                  } else {
                    throw new Error('No proxies exist')
                  }
                }
              })
            }
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
    [extrinsic, extensionAddress, chain, injectMetadata]
  )

  return { createProxy, ready: apiLoadable.state === 'hasValue' && !!estimatedFee, estimatedFee }
}

/**
 * Given a proxied addrss, transfer the proxied address to the multisig and deposit some funds into the proxied address
 * @param chain
 * @returns
 */
export const useTransferProxyToMultisig = (chain: Chain) => {
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(chain.genesisHash))
  const injectMetadata = useInjectMetadata(chain.genesisHash)

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
      const { signer, metadata } = await web3FromAddress(extensionAddress.toSs58(chain))

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
        api.tx.balances.transferKeepAlive(proxyAddress.bytes, existentialDeposit.amount),
        proxyCall,
      ])

      if (metadata) await injectMetadata(metadata)

      // Send the batch call
      const unsubscribe = await signerBatchCall
        .signAndSend(extensionAddress.toSs58(chain), { signer }, result => {
          try {
            handleSubmittableResultError(result)
            if (!(result?.status?.isFinalized || result.status.isInBlock)) return

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
    [apiLoadable.contents, apiLoadable.state, chain, injectMetadata]
  )

  return { transferProxyToMultisig, ready: apiLoadable.state === 'hasValue' }
}

import { useMemo } from 'react'
import { allRawPendingTransactionsSelector, RawPendingTransaction } from '@domains/chains/storage-getters'
import { tempCalldataState, extrinsicToDecoded } from '@domains/multisig'
import { useRecoilValue, useRecoilValueLoadable } from 'recoil'
import { Timepoint, Transaction } from '@domains/offchain-data/metadata/types'
import { makeTransactionID } from '@util/misc'
import { pjsApiSelector } from '@domains/chains/pjs-api'
import { useSelectedMultisig } from '@domains/multisig'
import { decodeCallData } from '@domains/chains'
import { allChainTokensSelector } from '@domains/chains'
import useGetTxsMetadata from '@domains/offchain-data/metadata/hooks/useGetTxsMetadata'

type RawPendingTransactionWithId = RawPendingTransaction & { id: string }

const usePendingTransactions = () => {
  const [
    {
      chain: { id: chainId, genesisHash },
    },
  ] = useSelectedMultisig()
  const allRawPendingTransactionsLoadable = useRecoilValueLoadable(allRawPendingTransactionsSelector)

  const allRawPendingTransactions = useMemo(() => {
    if (allRawPendingTransactionsLoadable.state === 'hasValue') {
      return allRawPendingTransactionsLoadable.contents
    }
    return []
  }, [allRawPendingTransactionsLoadable.contents, allRawPendingTransactionsLoadable.state])

  const { rawPendingTransactionsWithId } = allRawPendingTransactions.reduce(
    (acc, rawPending) => {
      const timepoint_height = rawPending.onChainMultisig.when.height.toNumber()
      const timepoint_index = rawPending.onChainMultisig.when.index.toNumber()

      const timepoint = {
        _and: [{ timepoint_height: { _eq: timepoint_height }, timepoint_index: { _eq: timepoint_index } }],
      }

      const id = makeTransactionID(rawPending.multisig.chain, timepoint_height, timepoint_index)

      acc.timepoints.push(timepoint)
      acc.rawPendingTransactionsWithId.push({
        ...rawPending,
        id,
      })

      return acc
    },
    { timepoints: [] as Timepoint[], rawPendingTransactionsWithId: [] as RawPendingTransactionWithId[] }
  )
  const { data, isLoading, isError } = useGetTxsMetadata()

  console.log({ data })

  const tempCalldata = useRecoilValue(tempCalldataState)
  const pjsApi = useRecoilValue(pjsApiSelector(genesisHash))
  const allActiveChainTokens = useRecoilValue(allChainTokensSelector)

  // get chain tokens
  const chainTokens = allActiveChainTokens.get(chainId)

  if (!pjsApi) throw Error(`pjsApi found for rpc ${chainId}!`)
  if (!chainTokens) throw Error(`Failed to load chainTokens for chain ${chainId}!`)

  const transactions = useMemo((): Transaction[] => {
    const _transactions: Transaction[] = []
    for (const rawPending of rawPendingTransactionsWithId) {
      try {
        const { id } = rawPending
        const metadata = data?.find(txMeta => {
          const extrinsic = decodeCallData(pjsApi, txMeta.callData)
          console.log({ callData: txMeta.callData })
          return (
            // TODO: This extrinsicId might be an issue when eager saving metadata
            txMeta.extrinsicId === id || pjsApi.registry.hash(extrinsic?.method.toU8a()).toHex() === rawPending.callHash
          )
        })

        let calldata = metadata?.callData ?? tempCalldata[id]

        if (calldata) {
          // create extrinsic from callData
          const extrinsic = decodeCallData(pjsApi, calldata)
          if (!extrinsic) {
            throw new Error(
              `Failed to create extrinsic from callData recieved from metadata sharing service for transactionID ${id}`
            )
          }

          // validate hash of extrinsic matches hash from chain
          const derivedHash = extrinsic.registry.hash(extrinsic.method.toU8a()).toHex()
          if (derivedHash !== rawPending.callHash) {
            throw new Error(
              `CallData from metadata sharing service for transactionID ${id} does not match hash from chain. Expected ${rawPending.callHash}, got ${derivedHash}`
            )
          }

          const decoded = extrinsicToDecoded(
            rawPending.multisig,
            extrinsic,
            chainTokens,
            metadata ?? { callData: calldata }
          )
          if (decoded === 'not_ours') continue

          _transactions.push({
            date: rawPending.date,
            callData: calldata as `0x${string}`,
            hash: rawPending.callHash,
            rawPending: rawPending,
            multisig: rawPending.multisig,
            approvals: rawPending.approvals,
            id,
            metadataSaved: true,
            ...decoded,
          })
        } else {
          _transactions.push({
            date: rawPending.date,
            hash: rawPending.callHash,
            rawPending: rawPending,
            multisig: rawPending.multisig,
            approvals: rawPending.approvals,
            id,
            metadataSaved: false,
            description: `Unknown transaction @ ${rawPending.id}`,
          })
        }
      } catch (e) {
        console.error(`Failed to create transaction from rawPendingTransaction ${rawPending.id}:`, e)
      }
    }
    return _transactions
  }, [chainTokens, data, pjsApi, rawPendingTransactionsWithId, tempCalldata])

  const loading = isLoading || allRawPendingTransactionsLoadable.state === 'loading'

  return { data: transactions, isLoading: loading, isError }
}

export default usePendingTransactions

import { useState, useEffect } from 'react'
import { allRawPendingTransactionsSelector, RawPendingTransaction } from '@domains/chains/storage-getters'
import { tempCalldataState, extrinsicToDecoded } from '@domains/multisig'
import { useRecoilValue, useRecoilValueLoadable } from 'recoil'
import useGetTxsMetadataByTimepoints from '@domains/offchain-data/metadata/hooks/useGetTxsMetadataByTimepoints'
import { Timepoint, Transaction } from '@domains/offchain-data/metadata/types'
import { makeTransactionID } from '@util/misc'
import { pjsApiSelector } from '@domains/chains/pjs-api'
import { useSelectedMultisig } from '@domains/multisig'
import { decodeCallData } from '@domains/chains'
import { allChainTokensSelector } from '@domains/chains'
import { useBlocksByHashes } from '@domains/chains/storage-getters'

type RawPendingTransactionWithId = RawPendingTransaction & { id: string }

const usePendingTransactions = () => {
  const [allRawPendingTransactions, setAllRawPendingTransactions] = useState<RawPendingTransaction[]>([])
  const [
    {
      chain: { id: chainId, genesisHash },
    },
  ] = useSelectedMultisig()
  const allRawPendingTransactionsLoadable = useRecoilValueLoadable(allRawPendingTransactionsSelector)

  useEffect(() => {
    if (allRawPendingTransactionsLoadable.state === 'hasValue') {
      setAllRawPendingTransactions(allRawPendingTransactionsLoadable.contents)
    }
  }, [allRawPendingTransactionsLoadable])

  const { timepoints, rawPendingTransactionsWithId } = allRawPendingTransactions.reduce(
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
  const { data, isLoading, isError } = useGetTxsMetadataByTimepoints({ timepoints })

  const blocksString = (
    rawPendingTransactionsWithId.map(tx => `${tx.blockHash.toHex()}-${tx.multisig.chain.genesisHash}`) ?? []
  ).join(',')
  const blocksLoadable = useBlocksByHashes(blocksString)
  const tempCalldata = useRecoilValue(tempCalldataState)
  const pjsApi = useRecoilValue(pjsApiSelector(genesisHash))
  const allActiveChainTokens = useRecoilValue(allChainTokensSelector)

  // get chain tokens
  const chainTokens = allActiveChainTokens.get(chainId)

  if (!pjsApi) throw Error(`pjsApi found for rpc ${chainId}!`)
  if (!chainTokens) throw Error(`Failed to load chainTokens for chain ${chainId}!`)

  const transactions: Transaction[] = []
  for (const rawPending of rawPendingTransactionsWithId) {
    const { id } = rawPending
    const metadata = data?.find(txMeta => txMeta.extrinsicId === id)

    let calldata = metadata?.callData ?? tempCalldata[id]

    // TODO: Add fetchBlocks logic
    // if (!calldata && data && data?.length > 0) {
    //   const block = useRecoilValue(blockSelector(`${rawPending.blockHash.toHex()}-${rawPending.multisig.chain.genesisHash}`))
    //   if (block) {
    //     const ext = block.block.extrinsics[timepoint_index]
    //     if (ext) {
    //       const innerExt = ext.method.args[3]! // proxy ext is 3rd arg
    //       calldata = innerExt.toHex()
    //     }
    //   }
    // }

    if (!calldata && data && blocksLoadable.state === 'hasValue') {
      const block = blocksLoadable.contents.find(b => b?.block.header.hash.toHex() === rawPending.blockHash.toHex())

      if (block) {
        const timepoint_index = rawPending.onChainMultisig.when.index.toNumber()
        const ext = block.block.extrinsics[timepoint_index]
        if (ext) {
          const innerExt = ext.method.args[3]! // proxy ext is 3rd arg
          console.log({ innerExt: innerExt.toHex() }) // not the correct callData
          calldata = innerExt.toHex()
        }
      }
    }

    // }
    if (calldata) {
      console.log({ calldata })
      // create extrinsic from callData
      const extrinsic = decodeCallData(pjsApi, calldata)
      console.log({ extrinsic })
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

      transactions.push({
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
    }
  }

  const loading = isLoading || allRawPendingTransactionsLoadable.state === 'loading'

  return { data: transactions, isLoading: loading, isError }
}

export default usePendingTransactions

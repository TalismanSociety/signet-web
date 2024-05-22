import { useEffect, useState, useCallback, useMemo } from 'react'
import { useReferenda } from '@domains/referenda'
import { useConfirmedTransactions } from '@domains/tx-history'
import { useRecoilValue } from 'recoil'
import useGetReferendums from '@hooks/queries/useGetReferendums'
import { selectedTeamsState } from '@domains/offchain-data'
import { Button } from '@talismn/ui'
import PendingVotesTable from './PendingVotesTable'
import AmountRow from '@components/AmountRow'
import { VotePill } from '../../../layouts/Overview/Transactions/VoteTransactionDetails'
import { Multisig } from '@domains/multisig'
import { Transaction } from '@domains/multisig'
import { ColumnDef } from '@tanstack/react-table'
import BN from 'bn.js'
import { SupportedChainIds } from '@domains/chains/generated-chains'

interface PendingVotesProps {
  multisig: Multisig
  handleOnRemoveVote: (referendumId: string) => void
}

const PendingVotes: React.FC<PendingVotesProps> = ({ multisig, handleOnRemoveVote }) => {
  const [referendumTxs, setReferendumTxs] = useState<Transaction[]>([])
  const selectedTeams = useRecoilValue(selectedTeamsState)
  const { transactions, loading: isTransactionsLoading } = useConfirmedTransactions(selectedTeams ?? [])
  const { referendums, isLoading: isReferendumsLoading } = useReferenda(multisig.chain)

  const txReferendumIds = useMemo(
    () => referendumTxs.map(tx => String(tx.decoded!.voteDetails!.referendumId)),
    [referendumTxs]
  )
  const { data: referendumsData, isLoading: isReferendumsDataLoading } = useGetReferendums({
    chainId: multisig.chain.squidIds.chainData as SupportedChainIds,
    ids: txReferendumIds,
  })

  const ongoingReferendumsIds = useMemo(
    () => referendums?.flatMap(referendum => (referendum.isOngoing ? [referendum.index] : [])),
    [referendums]
  )

  const filterLatestTransactions = useCallback(
    (transactions: Transaction[]): Transaction[] => {
      const result = transactions.reduce((acc, transaction) => {
        const referendumId = String(transaction?.decoded?.voteDetails?.referendumId)
        const block = transaction?.executedAt?.block!

        const isInOngoingReferendum = ongoingReferendumsIds?.includes(Number(referendumId))
        // Do not display transactions that are not part of ongoing referendums
        if (!isInOngoingReferendum) return acc
        // Only store the latest transaction for each referendum
        if (!acc[referendumId] || acc[referendumId]?.executedAt?.block! < block) {
          acc[referendumId] = transaction
        }
        return acc
      }, {} as Record<string, Transaction>)

      // Filter out the removeVote transactions
      return Object.values(result).filter(tx => tx.decoded?.voteDetails?.method !== 'removeVote')
    },
    [ongoingReferendumsIds]
  )

  useEffect(() => {
    if (transactions?.length) {
      setReferendumTxs(filterLatestTransactions(transactions))
    }
  }, [filterLatestTransactions, transactions])

  const columns: ColumnDef<Transaction>[] = useMemo(
    () => [
      {
        header: 'Proposal',
        accessorKey: 'description',
        cell: ({ row: { original } }) => {
          const referendumId = original.decoded?.voteDetails?.referendumId
          const { title } = referendumsData?.find(ref => ref?.referendumIndex === referendumId) || {}
          const headlineText = title ? `Proposal #${referendumId} - ${title}` : `Proposal #${referendumId}`
          return <div>{headlineText}</div>
        },
      },
      {
        id: 'voteFor',
        cell: ({ row: { original } }) => {
          return (
            <div className="flex items-center">
              <VotePill voteDetails={original.decoded?.voteDetails!} />
            </div>
          )
        },
      },
      {
        id: 'amount',
        cell: ({ row: { original } }) => {
          const { convictionVote, details, token, method } = original.decoded?.voteDetails!
          const { Standard, SplitAbstain } = details

          if (!method) return null

          const amount =
            convictionVote === 'SplitAbstain' && SplitAbstain
              ? Object.values(SplitAbstain).reduce((acc, balance) => acc.add(balance), new BN(0))
              : new BN(0)

          return <AmountRow balance={{ amount: Standard?.balance! || amount, token }} />
        },
      },
      {
        id: 'conviction',
        cell: ({ row: { original } }) => {
          if (original.decoded?.voteDetails?.convictionVote !== 'Standard') return null
          return <div>{original.decoded?.voteDetails?.details.Standard?.vote.conviction}x</div>
        },
      },
      {
        id: 'actions',
        cell: ({ row: { original } }) => {
          return (
            <div className="flex justify-end">
              <Button onClick={() => handleOnRemoveVote(String(original.decoded?.voteDetails?.referendumId))}>
                Remove
              </Button>
            </div>
          )
        },
      },
    ],
    [handleOnRemoveVote, referendumsData]
  )

  return (
    <div className="flex flex-col gap-8">
      <h2>Pending votes</h2>
      <PendingVotesTable
        columns={columns}
        data={referendumTxs}
        isLoading={
          (isTransactionsLoading || isReferendumsLoading || (isReferendumsDataLoading && !referendumsData.length)) &&
          referendumTxs.length === 0
        }
      />
    </div>
  )
}

export default PendingVotes

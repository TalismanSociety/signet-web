import { useEffect, useState, useCallback, useMemo } from 'react'
import { useReferenda } from '@domains/referenda'
import { useConfirmedTransactions } from '@domains/tx-history'

import { selectedTeamsState } from '@domains/offchain-data'
import { useRecoilValue } from 'recoil'
import { Button } from '@talismn/ui'
import { Multisig } from '@domains/multisig'
import { Transaction } from '@domains/multisig'

interface PendingVotesProps {
  multisig: Multisig
  handleOnRemoveVote: (referendumId: string) => void
}

const PendingVotes: React.FC<PendingVotesProps> = ({ multisig, handleOnRemoveVote }) => {
  const [latestTxs, setLatestTxs] = useState<Transaction[]>([])
  const selectedTeams = useRecoilValue(selectedTeamsState)
  const { transactions, loading } = useConfirmedTransactions(selectedTeams ?? [])
  const { referendums } = useReferenda(multisig.chain)

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
      setLatestTxs(filterLatestTransactions(transactions))
    }
  }, [filterLatestTransactions, transactions])

  return (
    <div>
      <h2>Pending votes</h2>
      {loading && <div>Loading...</div>}
      {!loading && !latestTxs?.length && <div>No pending votes</div>}
      {latestTxs?.map(tx => (
        <div className="w-full" key={tx.hash}>
          <div className="w-full h-20 m-4 px-2 bg-red-500 flex">
            <div>
              {tx.decoded?.voteDetails?.referendumId} {tx.description}
            </div>
            <Button
              className="ml-auto mr-0"
              onClick={() => handleOnRemoveVote(String(tx.decoded?.voteDetails?.referendumId))}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default PendingVotes

import { useReferenda } from '@domains/referenda'
import { useConfirmedTransactions } from '@domains/tx-history'

import { selectedTeamsState } from '@domains/offchain-data'
import { useRecoilValue } from 'recoil'
import { Button } from '@talismn/ui'
import { Multisig } from '@domains/multisig'

interface PendingVotesProps {
  multisig: Multisig
  handleOnRemoveVote: (referendumId: string) => void
}

const PendingVotes: React.FC<PendingVotesProps> = ({ multisig, handleOnRemoveVote }) => {
  const selectedTeams = useRecoilValue(selectedTeamsState)
  const { transactions, loading, totalTransactions } = useConfirmedTransactions(selectedTeams ?? [])
  const { referendums } = useReferenda(multisig.chain)

  const ongoingReferendumsIds = referendums?.flatMap(referendum => (referendum.isOngoing ? [referendum.index] : []))

  console.log({ transactions })

  const ongoingReferendumsTxs = transactions?.filter(tx =>
    ongoingReferendumsIds?.includes(Number(tx.decoded?.voteDetails?.referendumId))
  )

  return (
    <div>
      <h2>Pending votes</h2>
      {loading && <div>Loading...</div>}
      {ongoingReferendumsTxs?.map(tx => (
        <div className="w-full">
          <div className="w-full h-20 m-4 px-2 bg-red-500 flex">
            <div>{tx.decoded?.voteDetails?.referendumId}</div>
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

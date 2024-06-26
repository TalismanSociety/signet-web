import { css } from '@emotion/css'
import { Button } from '@talismn/ui'
import { VoteDetailsForm } from '@domains/referenda'

type Props = {
  voteDetails: VoteDetailsForm
  setVoteDetails: React.Dispatch<React.SetStateAction<VoteDetailsForm>>
}

const VoteOptions: React.FC<Props> = ({ voteDetails, setVoteDetails }) => {
  return (
    <div
      className={css`
        background-color: var(--color-backgroundSecondary);
        border-radius: 12px;
        display: flex;
        gap: 4px;
        padding: 4px;
        button {
          width: 100%;
        }
      `}
    >
      <Button
        onClick={() => {
          setVoteDetails(prev => {
            const updatedDetails = { ...prev }
            updatedDetails.convictionVote = 'Standard'
            updatedDetails.details.Standard.vote.aye = true
            return updatedDetails
          })
        }}
        variant={
          voteDetails.details.Standard.vote.aye && voteDetails.convictionVote === 'Standard' ? undefined : 'secondary'
        }
      >
        Aye
      </Button>
      <Button
        onClick={() => {
          setVoteDetails(prev => {
            const updatedDetails = { ...prev }
            updatedDetails.convictionVote = 'Standard'
            updatedDetails.details.Standard.vote.aye = false
            return updatedDetails
          })
        }}
        css={({ color }) => ({
          backgroundColor:
            voteDetails.details.Standard.vote.aye === false && voteDetails.convictionVote === 'Standard'
              ? '#f46161'
              : undefined,
        })}
        variant={
          voteDetails.details.Standard.vote.aye === false && voteDetails.convictionVote === 'Standard'
            ? undefined
            : 'secondary'
        }
      >
        Nay
      </Button>
      <Button
        onClick={() => {
          setVoteDetails(prev => {
            const updatedDetails = { ...prev }
            updatedDetails.convictionVote = 'SplitAbstain'
            updatedDetails.details.Standard.vote.aye = true
            return updatedDetails
          })
        }}
        css={({ color }) => ({
          backgroundColor: voteDetails.convictionVote === 'SplitAbstain' ? '#B9D9FF' : undefined,
        })}
        variant={voteDetails.convictionVote === 'SplitAbstain' ? undefined : 'secondary'}
      >
        Abstain
      </Button>
    </div>
  )
}

export default VoteOptions

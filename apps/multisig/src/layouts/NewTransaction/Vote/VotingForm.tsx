import React from 'react'
import { Button } from '@components/ui/button'
import { BaseToken } from '@domains/chains'
import { useSelectedMultisig } from '@domains/multisig'
import { VoteDetailsState, isVoteDetailsComplete } from '@domains/referenda'
import VoteOptions from './VoteOptions'
import VoteStandard from './mode/VoteStandard'
import { ProposalsDropdown } from './ProposalsDropdown'
import { hasPermission } from '@domains/proxy/util'
import { Alert } from '@components/Alert'
import { NewTransactionHeader } from '../NewTransactionHeader'
import { Vote } from '@talismn/icons'

type Props = {
  token?: BaseToken
  voteDetails: VoteDetailsState
  setVoteDetails: React.Dispatch<React.SetStateAction<VoteDetailsState>>
  onNext: () => void
}

const VotingForm: React.FC<Props> = ({ setVoteDetails, onNext, token, voteDetails }) => {
  const [multisig] = useSelectedMultisig()

  const { hasDelayedPermission, hasNonDelayedPermission } = hasPermission(multisig, 'governance')

  return (
    <>
      <NewTransactionHeader icon={<Vote />} title="Vote" />
      <div className="grid gap-[32px] mt-[32px] w-full">
        <ProposalsDropdown
          chain={multisig.chain}
          referendumId={voteDetails.referendumId}
          onChange={referendumId => setVoteDetails(prev => ({ ...prev, referendumId }))}
        />
        <VoteOptions setVoteDetails={setVoteDetails} voteDetails={voteDetails} />
        {voteDetails.convictionVote === 'Standard' ? (
          <VoteStandard setVoteDetails={setVoteDetails} token={token} params={voteDetails.details.Standard!} />
        ) : (
          // TODO: add UI for Split votes
          <div>Abstain Options</div>
        )}

        {hasNonDelayedPermission === false ? (
          hasDelayedPermission ? (
            <Alert>
              <p>Time delayed proxies are not supported yet.</p>
            </Alert>
          ) : (
            <Alert>
              <p>Your Multisig does not have the proxy permission required to vote on behalf of the proxied account.</p>
            </Alert>
          )
        ) : (
          // TODO: Update validation for voting
          <Button onClick={onNext} disabled={!hasNonDelayedPermission}>
            {/* <Button onClick={onNext} disabled={!isVoteDetailsComplete(voteDetails) || !hasNonDelayedPermission}> */}
            Review
          </Button>
        )}
      </div>
    </>
  )
}

export default VotingForm

import { Button } from '@components/ui/button'
import { BaseToken } from '@domains/chains'
import { useSelectedMultisig } from '@domains/multisig'
import { VoteDetails, isVoteDetailsComplete } from '@domains/referenda'
import VoteOptions from './VoteOptions'
import VoteStandard from './mode/VoteStandard'
import { ProposalsDropdown } from './ProposalsDropdown'
import { hasPermission } from '@domains/proxy/util'
import { Alert } from '@components/Alert'
import { NewTransactionHeader } from '../NewTransactionHeader'
import { Vote } from '@talismn/icons'

type Props = {
  token?: BaseToken
  voteDetails: VoteDetails
  onChange: (v: VoteDetails) => void
  onNext: () => void
}

const VotingForm: React.FC<Props> = ({ onChange, onNext, token, voteDetails }) => {
  const [multisig] = useSelectedMultisig()

  const { hasDelayedPermission, hasNonDelayedPermission } = hasPermission(multisig, 'governance')

  const handleDetailsChange = (details: VoteDetails['details']) => {
    onChange({ referendumId: voteDetails.referendumId, details })
  }

  return (
    <>
      <NewTransactionHeader icon={<Vote />} title="Vote" />
      <div className="grid gap-[32px] mt-[32px] w-full">
        <ProposalsDropdown
          chain={multisig.chain}
          referendumId={voteDetails.referendumId}
          onChange={referendumId => onChange({ ...voteDetails, referendumId })}
        />
        <VoteOptions onChange={handleDetailsChange} value={voteDetails.details} />
        {voteDetails.details.Standard ? (
          <VoteStandard onChange={handleDetailsChange} token={token} params={voteDetails.details.Standard} />
        ) : // TODO: add UI for Abstain and Split votes
        null}

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
          <Button onClick={onNext} disabled={!isVoteDetailsComplete(voteDetails) || !hasNonDelayedPermission}>
            Review
          </Button>
        )}
      </div>
    </>
  )
}

export default VotingForm

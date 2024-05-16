import { useMemo, useState } from 'react'
import {
  SplitAbstainVoteParams,
  StandardVoteParams,
  VoteDetails,
  defaultVote,
  isVoteDetailsComplete,
  isVoteFeatureSupported,
} from '@domains/referenda'
import VotingForm from './VotingForm'
import { useRecoilValue, useRecoilValueLoadable } from 'recoil'
import { selectedMultisigChainTokensState, selectedMultisigState } from '@domains/multisig'
import { SplitVoteParams } from '@domains/referenda'
import { pjsApiSelector } from '@domains/chains/pjs-api'
import { TransactionSidesheet } from '@components/TransactionSidesheet'
import { useToast } from '@components/ui/use-toast'
import PendingVotes from './PendingVotes'

const VoteAction: React.FC = () => {
  const multisig = useRecoilValue(selectedMultisigState)
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(multisig.chain.genesisHash))
  const tokens = useRecoilValueLoadable(selectedMultisigChainTokensState)
  const [reviewing, setReviewing] = useState(false)
  const [removeVoteId, setRemoveVoteId] = useState<string | null>(null)
  const [voteDetails, setVoteDetails] = useState<VoteDetails>(defaultVote)
  const { toast } = useToast()

  // instead of allowing the user to select any token later on, we just use the first native token of the chain
  const nativeToken =
    tokens.state === 'hasValue' ? tokens.contents.find(({ type }) => type === 'substrate-native') : undefined
  const isPalletSupported = apiLoadable.state === 'hasValue' ? isVoteFeatureSupported(apiLoadable.contents) : undefined

  const isApiReady =
    apiLoadable.state === 'hasValue' &&
    apiLoadable.contents.tx &&
    !!apiLoadable.contents.tx?.convictionVoting &&
    !!isPalletSupported

  const extrinsic = useMemo(() => {
    if (!isApiReady) return
    try {
      let extrinsicAction

      if (removeVoteId) {
        extrinsicAction = apiLoadable.contents.tx?.convictionVoting.removeVote(null, removeVoteId)
      } else if (isVoteDetailsComplete(voteDetails)) {
        const selectedConviction = { [voteDetails.convictionVote!]: voteDetails.details[voteDetails.convictionVote!] }

        extrinsicAction = apiLoadable.contents.tx?.convictionVoting.vote(
          voteDetails.referendumId!,
          selectedConviction as
            | { Standard: StandardVoteParams }
            | { Split: SplitVoteParams }
            | { SplitAbstain: SplitAbstainVoteParams }
        )
      }

      return extrinsicAction
    } catch (e) {
      console.error(e)
    }
  }, [apiLoadable.contents.tx?.convictionVoting, isApiReady, removeVoteId, voteDetails])

  const handleOnRemoveVote = (referendumId: string) => {
    setRemoveVoteId(referendumId)
    setReviewing(true)
  }

  const transactionName = useMemo(() => {
    if (removeVoteId) {
      return `Remove vote on Proposal #${removeVoteId}`
    }
    let vote = voteDetails.details.Standard?.vote.aye ? 'Aye' : 'Nay'
    if (voteDetails.convictionVote === 'SplitAbstain') {
      vote = 'Abstain'
    }
    return `Vote ${vote} on Proposal #${voteDetails.referendumId}`
  }, [removeVoteId, voteDetails.convictionVote, voteDetails.details.Standard?.vote.aye, voteDetails.referendumId])

  return (
    <div className="flex flex-1 flex-col gap-8" css={{ padding: '32px 8%' }}>
      <div css={{ width: '100%', maxWidth: 490 }}>
        <VotingForm
          voteDetails={voteDetails}
          token={nativeToken}
          setVoteDetails={setVoteDetails}
          onNext={() => setReviewing(true)}
        />
        {extrinsic && (
          <TransactionSidesheet
            calldata={extrinsic.method.toHex()}
            description={transactionName}
            onApproveFailed={e => {
              setReviewing(false)
              toast({
                title: 'Failed to create transaction',
                description: e.message,
              })
            }}
            onClose={() => {
              setReviewing(false)
              setRemoveVoteId(null)
            }}
            open={reviewing}
          />
        )}
      </div>
      <PendingVotes multisig={multisig} handleOnRemoveVote={handleOnRemoveVote} />
    </div>
  )
}

export default VoteAction

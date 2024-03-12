import { useMemo, useState } from 'react'
import {
  SplitAbstainVoteParams,
  StandardVoteParams,
  VoteDetails,
  defaultVoteDetails,
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

const VoteAction: React.FC = () => {
  const multisig = useRecoilValue(selectedMultisigState)
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(multisig.chain.genesisHash))
  const tokens = useRecoilValueLoadable(selectedMultisigChainTokensState)
  const [reviewing, setReviewing] = useState(false)
  const [voteDetails, setVoteDetails] = useState<VoteDetails>({
    details: { Standard: defaultVoteDetails.Standard },
  })
  const { toast } = useToast()

  // instead of allowing the user to select any token later on, we just use the first native token of the chain
  const nativeToken =
    tokens.state === 'hasValue' ? tokens.contents.find(({ type }) => type === 'substrate-native') : undefined
  const isPalletSupported = apiLoadable.state === 'hasValue' ? isVoteFeatureSupported(apiLoadable.contents) : undefined

  const extrinsic = useMemo(() => {
    if (
      apiLoadable.state !== 'hasValue' ||
      !isPalletSupported ||
      voteDetails.referendumId === undefined ||
      !apiLoadable.contents.tx ||
      !apiLoadable.contents.tx?.convictionVoting ||
      !nativeToken ||
      !isVoteDetailsComplete(voteDetails)
    )
      return
    try {
      const voteExtrinsic = apiLoadable.contents.tx?.convictionVoting.vote(
        voteDetails.referendumId,
        voteDetails.details as
          | { Standard: StandardVoteParams }
          | { Split: SplitVoteParams }
          | { SplitAbstain: SplitAbstainVoteParams }
      )
      return voteExtrinsic
    } catch (e) {
      console.error(e)
    }
  }, [apiLoadable.contents.tx, apiLoadable.state, isPalletSupported, nativeToken, voteDetails])

  const transactionName = useMemo(() => {
    const vote = voteDetails.details.Standard?.vote.aye ? 'Aye' : 'Nay'
    return `Vote ${vote} on Proposal #${voteDetails.referendumId}`
  }, [voteDetails])

  return (
    <div css={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '32px 8%' }}>
      <div css={{ width: '100%', maxWidth: 490 }}>
        <VotingForm
          voteDetails={voteDetails}
          token={nativeToken}
          onChange={setVoteDetails}
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
            onClose={() => setReviewing(false)}
            open={reviewing}
          />
        )}
      </div>
    </div>
  )
}

export default VoteAction

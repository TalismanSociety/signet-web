import { mapConvictionToIndex, VoteDetails, VoteMethod } from '@domains/referenda'
import { TxDecoder } from './tx-decoders.types'
import BN from 'bn.js'
import { TransactionType } from '@domains/offchain-data/metadata/types'

export const decodeConvictionVoting: TxDecoder = ({ methodArg, tokens, metadata }) => {
  if (methodArg?.section === 'convictionVoting') {
    const { poll_index, vote, index } = methodArg.args
    let voteDetails: VoteDetails | undefined

    if (methodArg?.method === 'removeVote') {
      voteDetails = {
        referendumId: index,
        method: methodArg.method,
        details: {},
      }
    }

    if (vote?.Standard) {
      voteDetails = {
        referendumId: poll_index,
        method: methodArg.method as VoteMethod,
        convictionVote: 'Standard',
        details: {
          Standard: {
            balance: new BN(vote.Standard.balance.replaceAll(',', '')),
            vote: {
              aye: vote.Standard.vote.vote === 'Aye',
              conviction: mapConvictionToIndex(vote.Standard.vote.conviction),
            },
          },
        },
      }
    }

    if (vote?.SplitAbstain) {
      voteDetails = {
        referendumId: poll_index,
        method: methodArg.method as VoteMethod,
        convictionVote: 'SplitAbstain',
        details: {
          SplitAbstain: {
            aye: new BN(vote.SplitAbstain.aye.replaceAll(',', '')),
            nay: new BN(vote.SplitAbstain.nay.replaceAll(',', '')),
            abstain: new BN(vote.SplitAbstain.abstain.replaceAll(',', '')),
          },
        },
      }
    }

    if (voteDetails) {
      const token = tokens.find(t => t.type === 'substrate-native')
      if (!token) throw Error(`Chain does not have a native token!`)
      return {
        decoded: {
          type: TransactionType.Vote,
          recipients: [],
          voteDetails: {
            ...voteDetails,
            token,
          },
        },
        description: metadata?.description ?? `Vote on referendum #${poll_index}`,
      }
    }
  }

  return null
}

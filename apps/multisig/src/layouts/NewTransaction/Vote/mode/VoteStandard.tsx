import React from 'react'
import { AmountFlexibleInput } from '@components/AmountFlexibleInput'
import { BaseToken } from '@domains/chains'
import { StandardVoteParams, VoteDetails } from '@domains/referenda'
import ConvictionsDropdown from '../ConvictionsDropdown'
import { parseUnits } from '@util/numbers'
import BN from 'bn.js'

type Props = {
  token?: BaseToken
  setVoteDetails: React.Dispatch<React.SetStateAction<VoteDetails>>
  params: StandardVoteParams
}

const VoteStandard = ({ params, setVoteDetails, token }: Props) => {
  const handleAmountChange = (amount: string) => {
    if (!token) return

    let balance = new BN(0)
    try {
      balance = parseUnits(amount, token.decimals)
    } catch (e) {
      // if failed to parse, input is likely '' or invalid number, hence we default to BN(0)
      balance = new BN(0)
    }
    if (balance.eq(params.balance)) return

    setVoteDetails(prev => {
      const updatedVal = { ...prev }
      updatedVal.details.Standard!.balance = balance
      return updatedVal
    })
  }

  return (
    <>
      <AmountFlexibleInput
        // the tokens list should only contain the chain's native token
        tokens={token ? [token] : []}
        selectedToken={token}
        leadingLabel="Amount to vote"
        setAmount={handleAmountChange}
      />
      <ConvictionsDropdown setVoteDetails={setVoteDetails} conviction={params.vote.conviction} />
    </>
  )
}

export default VoteStandard

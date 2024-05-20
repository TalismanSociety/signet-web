import { BaseToken } from '@domains/chains'
import { VoteDetails } from '@domains/referenda'
import { AmountFlexibleInput } from '@components/AmountFlexibleInput'
import { parseUnits } from '@util/numbers'
import BN from 'bn.js'

interface VoteSplitAbstainProps {
  token?: BaseToken
  setVoteDetails: React.Dispatch<React.SetStateAction<VoteDetails>>
}

enum VoteDirection {
  Abstain = 'abstain',
  Aye = 'aye',
  Nay = 'nay',
}

export default function VoteSplitAbstain({ token, setVoteDetails }: VoteSplitAbstainProps) {
  const handleAmountChange = (amount: string, field: VoteDirection) => {
    if (!token) return

    let balance = new BN(0)
    try {
      balance = parseUnits(amount, token.decimals)
    } catch (e) {
      // if failed to parse, input is likely '' or invalid number, hence we default to BN(0)
      balance = new BN(0)
    }

    setVoteDetails(prev => {
      const prevBal = prev.details.SplitAbstain![field]
      if (balance.eq(prevBal)) return prev

      const updatedVal = { ...prev }
      updatedVal.details.SplitAbstain![field] = balance
      return updatedVal
    })
  }

  return (
    <>
      {Object.values(VoteDirection).map(direction => (
        <AmountFlexibleInput
          key={direction}
          tokens={token ? [token] : []}
          selectedToken={token}
          leadingLabel={`Amount to ${direction} vote`}
          placeholder={`0 ${token?.symbol} (optional)`}
          setAmount={amount => handleAmountChange(amount, direction)}
        />
      ))}
    </>
  )
}

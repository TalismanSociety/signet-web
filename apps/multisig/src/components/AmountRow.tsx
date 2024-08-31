import { useRecoilValueLoadable } from 'recoil'
import { tokenPriceState } from '@domains/chains'
import { Balance } from '@domains/multisig'
import { balanceToFloat, formatUsd } from '../util/numbers'
import { Skeleton } from '@talismn/ui'
import { cn } from '@util/tailwindcss'

const AmountRow = ({
  balance,
  hideIcon,
  hideSymbol,
  sameLine,
  fontSize = 16,
}: {
  balance: Balance
  hideIcon?: boolean
  hideSymbol?: boolean
  sameLine?: boolean
  fontSize?: number
}) => {
  const price = useRecoilValueLoadable(tokenPriceState(balance.token))
  const balanceFloat = balanceToFloat(balance)
  return (
    <div className={sameLine ? 'items-center flex gap-[4px]' : 'items-end flex-col'}>
      <div className="flex items-center text-gray-200 gap-[4px]">
        {!hideIcon && <img className="w-[20px] min-w-[20px]" src={balance.token.logo} alt="token logo" />}
        <p className={`mt-[3px] text-offWhite h-max leading-none text-[${fontSize}px]`}>{balanceFloat.toFixed(4)}</p>
        {!hideSymbol && <p className="mt-[3px] text-offWhite h-max leading-none">{balance.token.symbol}</p>}
      </div>
      {price.state === 'hasValue' ? (
        price.contents.current === 0 ? null : (
          <p className={cn('text-right', sameLine ? 'text-[16px] mt-[3px]' : 'text-[12px]')}>
            {`(${formatUsd(balanceFloat * price.contents.current)})`}
          </p>
        )
      ) : (
        <Skeleton.Surface css={{ height: '14px', minWidth: '125px' }} />
      )}
    </div>
  )
}

export default AmountRow

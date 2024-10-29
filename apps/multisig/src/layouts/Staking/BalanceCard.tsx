import { formatDecimals } from '@talismn/util'
import { formatUsd } from '../../util/numbers'
import { Skeleton } from '@talismn/ui'

type Props = {
  label: string
  symbol?: string
  amount?: number
  price?: number
  description?: React.ReactNode
}

export const BalanceCard: React.FC<Props> = ({ description, label, symbol, amount, price }) => {
  const amountLoading = amount === undefined || symbol === undefined
  const usdLoading = price === undefined || amountLoading

  return (
    <div className="bg-gray-900 p-[16px] rounded-[12px] w-full overflow-hidden">
      <p className="text-[14px] mt-[2px]">{label}</p>
      <div className="flex items-center text-offWhite text-[16px] mt-[4px] gap-[8px]">
        {amountLoading ? (
          <Skeleton.Surface css={{ height: 22.9, width: 120 }} />
        ) : (
          <span>
            {formatDecimals(amount)} {symbol}
          </span>
        )}
        {usdLoading ? (
          <span>
            <Skeleton.Surface css={{ height: 16, width: 60 }} />
          </span>
        ) : (
          <span css={({ color }) => ({ color: color.lightGrey, fontSize: 14 })}>
            {price === 0 ? '' : formatUsd(amount * price)}
          </span>
        )}
      </div>
      <p className="text-[14px] overflow-hidden w-full truncate">{description}</p>
    </div>
  )
}

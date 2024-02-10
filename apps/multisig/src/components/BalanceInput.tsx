import { Chain } from '@domains/chains'
import { Input } from './ui/input'
import { useCallback, useState } from 'react'
import { BN } from '@polkadot/util'

import { useTokenByChain } from '@domains/balances/useTokenByChain'
import { Skeleton } from '@talismn/ui'
import { parseUnits } from '@util/numbers'

type Props = {
  chain: Chain
  onChange?: (value: BN) => void
  value?: BN
  label?: string
}

export const BalanceInput: React.FC<Props> = ({ chain, label, onChange, value }) => {
  const [input, setInput] = useState(value?.toString() ?? '')
  const { loading, decimal, symbol } = useTokenByChain(chain.rpcs)

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    e => {
      const { value } = e.target
      if (value === '') {
        setInput('')
        onChange?.(new BN(0))
      } else {
        try {
          const parsed = parseUnits(value, decimal?.toNumber() ?? 10)
          setInput(value)
          onChange?.(parsed)
        } catch (e) {}
      }
    },
    [decimal, onChange]
  )

  return (
    <Input
      label={label}
      value={input}
      onChange={handleChange}
      loading={loading}
      disabled={decimal === undefined}
      suffix={symbol === undefined ? <Skeleton.Surface className="w-[40px] h-[20px]" /> : <p>{symbol.toUpperCase()}</p>}
      type="number"
    />
  )
}

import { AmountUnit } from '@components/AmountUnitSelector'
import { Button } from '@components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@components/ui/dropdown-menu'
import { tokenPriceState } from '@domains/chains'
import { Skeleton } from '@talismn/ui'
import { ChevronDown, DollarSignIcon } from 'lucide-react'
import React, { useEffect } from 'react'
import { useRecoilState, useRecoilValue, useRecoilValueLoadable } from 'recoil'
import { multisendAmountUnitAtom, multisendTokenAtom } from './atom'

const tokenOption = {
  name: 'Tokens',
  value: AmountUnit.Token,
}
const usdOption = {
  name: 'USD',
  value: AmountUnit.UsdMarket,
}

const weekUsdOption = {
  name: 'USD (7D EMA)',
  value: AmountUnit.Usd7DayEma,
}

const monthUsdOption = {
  name: 'USD (30D EMA)',
  value: AmountUnit.Usd30DayEma,
}

export const MultisendTableAmountUnitDropdown: React.FC = () => {
  const token = useRecoilValue(multisendTokenAtom)
  const [unit, setUnit] = useRecoilState(multisendAmountUnitAtom)
  const tokenPrices = useRecoilValueLoadable(tokenPriceState(token))

  useEffect(() => {
    if (tokenPrices.state === 'hasValue') {
      let newAmountUnit = unit
      if (newAmountUnit === AmountUnit.Usd30DayEma && !tokenPrices.contents.averages?.ema30) {
        newAmountUnit = AmountUnit.Usd7DayEma
      }
      if (newAmountUnit === AmountUnit.Usd7DayEma && !tokenPrices.contents.averages?.ema7) {
        newAmountUnit = AmountUnit.UsdMarket
      }
      if (newAmountUnit === AmountUnit.UsdMarket && !tokenPrices.contents.current) {
        newAmountUnit = AmountUnit.Token
      }
      setUnit(newAmountUnit)
    }
  }, [tokenPrices, unit, setUnit])

  if (tokenPrices.state === 'loading' || !token) return <Skeleton.Surface className="w-[50px] h-[26px]" />

  if (tokenPrices.state !== 'hasValue' || (!tokenPrices.contents.averages && !tokenPrices.contents.current)) return null

  const unitOptions = [tokenOption, usdOption]
  if (tokenPrices.contents.averages) {
    if (tokenPrices.contents.averages.ema7) unitOptions.push(weekUsdOption)
    if (tokenPrices.contents.averages.ema30) unitOptions.push(monthUsdOption)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="w-auto px-[4px] h-auto py-[4px] border-gray-400 hover:bg-gray-900 gap-[4px]"
        >
          {unit === AmountUnit.Token ? (
            <img src={token.logo} alt={token.symbol} width={16} height={16} />
          ) : (
            <DollarSignIcon size={16} className="text-gray-200" />
          )}
          <ChevronDown size={12} className="text-gray-200" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="border-gray-700" align="end">
        {unitOptions.map(({ name, value }) => (
          <DropdownMenuItem key={value} onClick={() => setUnit(value)} className={unit === value ? 'bg-gray-800' : ''}>
            <div className="flex items-center gap-[8px]">
              {value === AmountUnit.Token ? (
                <img src={token.logo} alt={token.symbol} width={20} height={20} />
              ) : (
                <DollarSignIcon size={20} />
              )}
              <p className="mt-[3px] text-[14px]">{value === AmountUnit.Token ? token.symbol : name}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

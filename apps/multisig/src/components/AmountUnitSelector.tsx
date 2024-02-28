import { Fragment } from 'react'
import { Loadable } from 'recoil'
import { Price } from '../domains/chains'
import { cn } from '@util/tailwindcss'

export enum AmountUnit {
  Token,
  UsdMarket,
  Usd7DayEma,
  Usd30DayEma,
}

type Props = {
  value: AmountUnit
  onChange: (value: AmountUnit) => void
  tokenPrices: Loadable<Price>
}

const unitOptions = [
  {
    name: 'Tokens',
    value: AmountUnit.Token,
  },
  {
    name: 'Market (USD)',
    value: AmountUnit.UsdMarket,
  },
  {
    name: '7D EMA (USD)',
    value: AmountUnit.Usd7DayEma,
  },
  {
    name: '30D EMA (USD)',
    value: AmountUnit.Usd30DayEma,
  },
]

const AmountUnitSelector: React.FC<Props> = ({ onChange, value: selectedAmountUnit, tokenPrices }) => {
  if (tokenPrices.state === 'hasValue' && tokenPrices.contents.averages)
    return (
      <div className="flex-wrap flex items-center gap-[6px]">
        <p className="text-[12px]">Unit:</p>
        {unitOptions.map(({ name, value }) => (
          <Fragment key={value}>
            <p
              className={cn(
                'text-[12px] cursor-pointer',
                selectedAmountUnit === value ? 'font-bold text-offWhite mt-[-3px]' : 'text-gray-200'
              )}
              onClick={() => onChange(value)}
            >
              {name}
            </p>
            <span css={{ 'fontSize': 12, ':last-child': { display: 'none' } }}>|</span>
          </Fragment>
        ))}
      </div>
    )

  return (
    <p css={{ fontSize: 12 }}>
      {tokenPrices.state === 'loading'
        ? 'Loading...'
        : tokenPrices.state === 'hasError'
        ? 'Error fetching EMA price info'
        : 'EMA input is not available for this token'}
    </p>
  )
}

export default AmountUnitSelector

import { BaseToken, tokenPriceState } from '@domains/chains'
import { useEffect, useMemo, useState } from 'react'
import { useRecoilValueLoadable } from 'recoil'
import AmountUnitSelector, { AmountUnit } from '../AmountUnitSelector'
import { Input } from '@components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@components/ui/select'
import BN from 'bn.js'
import { formatUnits } from '@util/numbers'
import { Skeleton } from '@talismn/ui'

type Props = {
  tokens: BaseToken[]
  selectedToken: BaseToken | undefined
  leadingLabel?: string
  setAmount: (a: string) => void
  setSelectedToken?: (t: BaseToken) => void
  amountPerBlockBn?: BN
  placeholder?: string
}

export const AmountFlexibleInput: React.FC<Props> = ({
  amountPerBlockBn,
  tokens,
  selectedToken,
  leadingLabel,
  placeholder,
  setAmount,
  setSelectedToken,
}) => {
  const [input, setInput] = useState<string>('')
  const [amountUnit, setAmountUnit] = useState<AmountUnit>(AmountUnit.Token)
  const tokenPrices = useRecoilValueLoadable(tokenPriceState(selectedToken))

  useEffect(() => {
    if (tokenPrices.state === 'hasValue') {
      let newAmountUnit = amountUnit
      if (newAmountUnit === AmountUnit.Usd30DayEma && !tokenPrices.contents.averages?.ema30) {
        newAmountUnit = AmountUnit.Usd7DayEma
      }
      if (newAmountUnit === AmountUnit.Usd7DayEma && !tokenPrices.contents.averages?.ema7) {
        newAmountUnit = AmountUnit.UsdMarket
      }
      if (newAmountUnit === AmountUnit.UsdMarket && !tokenPrices.contents.current) {
        newAmountUnit = AmountUnit.Token
      }
      setAmountUnit(newAmountUnit)
    }
  }, [amountUnit, tokenPrices])

  const calculatedTokenAmount = useMemo((): string | undefined => {
    if (amountUnit === AmountUnit.Token) {
      return input
    }

    if (tokenPrices.state === 'hasValue') {
      if (amountUnit === AmountUnit.UsdMarket) {
        return (parseFloat(input) / tokenPrices.contents.current).toString()
      } else if (amountUnit === AmountUnit.Usd7DayEma) {
        if (!tokenPrices.contents.averages?.ema7) return '0'
        return (parseFloat(input) / tokenPrices.contents.averages.ema7).toString()
      } else if (amountUnit === AmountUnit.Usd30DayEma) {
        if (!tokenPrices.contents.averages?.ema30) return '0'
        return (parseFloat(input) / tokenPrices.contents.averages.ema30).toString()
      }
      return '0'
    }

    return '0'
  }, [amountUnit, input, tokenPrices])

  useEffect(() => {
    if (calculatedTokenAmount || calculatedTokenAmount === '') setAmount(calculatedTokenAmount)
  }, [calculatedTokenAmount, setAmount])

  const unit = useMemo(
    () => (amountUnit === AmountUnit.Token ? selectedToken?.symbol : 'USD'),
    [amountUnit, selectedToken]
  )

  return (
    <div className="flex w-full gap-[12px]">
      <div className="flex flex-1 items-center">
        <Input
          placeholder={placeholder || `0 ${unit}`}
          label={leadingLabel ?? `Amount`}
          labelTrailing={
            amountPerBlockBn ? (
              selectedToken ? (
                `(${formatUnits(amountPerBlockBn, selectedToken.decimals)} ${selectedToken?.symbol} per block)`
              ) : (
                <Skeleton.Surface className="h-[21px] w-[120px]" />
              )
            ) : undefined
          }
          suffix={
            calculatedTokenAmount && calculatedTokenAmount !== 'NaN' && amountUnit !== AmountUnit.Token ? (
              <p className="text-gray-200 text-[14px]">
                {(+calculatedTokenAmount).toFixed(4)} {selectedToken?.symbol}
              </p>
            ) : null
          }
          supportingLabel={
            <div className="w-full flex items-start justify-start mt-[4px] px-[8px]">
              <AmountUnitSelector value={amountUnit} onChange={setAmountUnit} tokenPrices={tokenPrices} />
            </div>
          }
          value={input}
          onChange={event => {
            if (!selectedToken) return

            // Create a dynamic regular expression.
            // This regex will:
            // - Match any string of up to `digits` count of digits, optionally separated by a decimal point.
            // - The total count of digits, either side of the decimal point, can't exceed `digits`.
            // - It will also match an empty string, making it a valid input.
            const digits = selectedToken.decimals
            let regex = new RegExp(
              '^(?:(\\d{1,' +
                digits +
                '})|(\\d{0,' +
                (digits - 1) +
                '}\\.\\d{1,' +
                (digits - 1) +
                '})|(\\d{1,' +
                (digits - 1) +
                '}\\.\\d{0,' +
                (digits - 1) +
                '})|^$)$'
            )
            if (regex.test(event.target.value)) {
              setInput(event.target.value)
            }
          }}
          externalSuffix={
            <div>
              <Select
                value={selectedToken?.id}
                onValueChange={id => setSelectedToken?.(tokens.find(t => t.id === id) as BaseToken)}
              >
                <SelectTrigger className="h-[56px]" hideArrow={tokens.length <= 1}>
                  <SelectValue placeholder="Select Token" />
                </SelectTrigger>
                <SelectContent>
                  {tokens.map(t => (
                    <SelectItem key={t.id} value={t.id} className="px-[8px] pl-[24px] h-[56px]">
                      <div className="flex items-center w-max gap-[8px]">
                        <img className="w-[24px] h-auto" src={t.logo} alt={t.symbol} />
                        <p className="mt-[2px] text-gray-200">{t.symbol}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>
    </div>
  )
}

import { BaseToken, tokenPriceState } from '@domains/chains'
import { css } from '@emotion/css'
import { useEffect, useMemo, useState } from 'react'
import { useRecoilValueLoadable } from 'recoil'
import AmountUnitSelector, { AmountUnit } from '../AmountUnitSelector'
import { Input } from '@components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@components/ui/select'

export const AmountFlexibleInput = (props: {
  tokens: BaseToken[]
  selectedToken: BaseToken | undefined
  amount: string
  leadingLabel?: string
  setAmount: (a: string) => void
  setSelectedToken?: (t: BaseToken) => void
}) => {
  const [input, setInput] = useState<string>('')
  const [amountUnit, setAmountUnit] = useState<AmountUnit>(AmountUnit.Token)
  const tokenPrices = useRecoilValueLoadable(tokenPriceState(props.selectedToken))

  useEffect(() => {
    setAmountUnit(AmountUnit.Token)
  }, [props.selectedToken])

  const calculatedTokenAmount = useMemo((): string | undefined => {
    if (amountUnit === AmountUnit.Token) {
      return input
    }

    if (tokenPrices.state === 'hasValue') {
      if (amountUnit === AmountUnit.UsdMarket) {
        return (parseFloat(input) / tokenPrices.contents.current).toString()
      } else if (amountUnit === AmountUnit.Usd7DayEma) {
        if (!tokenPrices.contents.averages?.ema7) throw Error('Unexpected missing ema7!')
        return (parseFloat(input) / tokenPrices.contents.averages.ema7).toString()
      } else if (amountUnit === AmountUnit.Usd30DayEma) {
        if (!tokenPrices.contents.averages?.ema30) throw Error('Unexpected missing ema30!')
        return (parseFloat(input) / tokenPrices.contents.averages.ema30).toString()
      }
      throw Error('Unexpected amount unit')
    }

    return '0'
  }, [amountUnit, input, tokenPrices])

  useEffect(() => {
    if (calculatedTokenAmount || calculatedTokenAmount === '') {
      props.setAmount(calculatedTokenAmount)
    }
  }, [calculatedTokenAmount, props])

  const unit = useMemo(() => {
    if (amountUnit === AmountUnit.Token) {
      return props.selectedToken?.symbol
    } else {
      return 'USD'
    }
  }, [amountUnit, props.selectedToken])

  return (
    <div css={{ display: 'flex', width: '100%', gap: '12px' }}>
      <div
        className={css`
          display: 'flex';
          flex-grow: 1;
          align-items: center;
        `}
      >
        <Input
          placeholder={`0 ${unit}`}
          label={props.leadingLabel ?? `Amount`}
          suffix={
            calculatedTokenAmount && calculatedTokenAmount !== 'NaN' && amountUnit !== AmountUnit.Token ? (
              <p className="text-gray-200 text-[14px]">
                {(+calculatedTokenAmount).toFixed(4)} {props.selectedToken?.symbol}
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
            if (!props.selectedToken) return

            // Create a dynamic regular expression.
            // This regex will:
            // - Match any string of up to `digits` count of digits, optionally separated by a decimal point.
            // - The total count of digits, either side of the decimal point, can't exceed `digits`.
            // - It will also match an empty string, making it a valid input.
            const digits = props.selectedToken.decimals
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
                {...props}
                value={props.selectedToken?.id}
                onValueChange={id => props.setSelectedToken?.(props.tokens.find(t => t.id === id) as BaseToken)}
              >
                <SelectTrigger className="h-[56px]" hideArrow={props.tokens.length <= 1}>
                  <SelectValue placeholder="Select Token" />
                </SelectTrigger>
                <SelectContent>
                  {props.tokens.map(t => (
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

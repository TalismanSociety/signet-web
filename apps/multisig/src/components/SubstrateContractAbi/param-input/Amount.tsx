import { Input } from '@components/ui/input'
import { ParamInputComponent } from './param-input.types'
import { useEffect } from 'react'
import BigNumber from 'bignumber.js'

export const AmountParamInput: ParamInputComponent<string> = ({ onChange, arg, param }) => {
  useEffect(() => {
    if (!arg) onChange({ valid: true, value: '0' })
  }, [arg, onChange])

  return (
    <div className="w-full">
      <Input
        value={arg?.value}
        onChange={e => {
          let { value } = e.target

          try {
            const val = new BigNumber(value)

            // unsigned numbers cannot be negative
            if (param.type.type[0] === 'u' && val.isNegative()) return

            const hasDecimal = value.includes('.')
            onChange({ valid: !val.isNaN() && !hasDecimal, value })
          } catch (e) {
            onChange({ valid: false, value })
          }
        }}
      />
      {arg?.value.includes('.') && (
        <p className="text-red-500 text-[12px] mt-[8px] ml-[4px]">Decimals input is not supported.</p>
      )}
    </div>
  )
}

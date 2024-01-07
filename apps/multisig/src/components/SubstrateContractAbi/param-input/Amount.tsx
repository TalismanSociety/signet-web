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
            onChange({ valid: !val.isNaN(), value })
          } catch (e) {
            onChange({ valid: false, value })
          }
        }}
      />
    </div>
  )
}

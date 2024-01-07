import { Input } from '@components/ui/input'
import { ParamInputComponent } from './param-input.types'
import { useEffect, useMemo } from 'react'

export const HashParamInput: ParamInputComponent<string> = ({ onChange, arg, param }) => {
  const { requiredLength, name } = useMemo(() => {
    if (param.type.type === 'H160') return { requiredLength: 42, name: 'H160 hash' }
    if (param.type.type === 'H512') return { requiredLength: 130, name: 'H512 hash' }
    return { requiredLength: 66, name: 'hash' }
  }, [param.type.type])

  useEffect(() => {
    if (arg === undefined) onChange({ valid: true, value: '0x'.padEnd(requiredLength, '0') })
  }, [arg, onChange, requiredLength])

  return (
    <div className="w-full">
      <Input
        value={arg?.value ?? ''}
        onChange={e => {
          const { value } = e.target
          let valid = true
          if (!value.startsWith('0x')) valid = false
          if (value.length !== requiredLength) valid = false
          onChange({ value, valid })
        }}
      />
      {!arg?.value.startsWith('0x') ? (
        <p className="text-red-500 text-[12px] mt-[8px] ml-[4px]">A hash must start with 0x (e.g. "0x......")</p>
      ) : (
        arg.value.length !== requiredLength && (
          <p className="text-red-500 text-[12px] mt-[8px] ml-[4px]">
            A {name} must be {requiredLength} characters long (including 0x)
          </p>
        )
      )}
    </div>
  )
}

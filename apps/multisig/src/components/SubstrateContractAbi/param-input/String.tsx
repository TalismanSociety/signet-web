import { Input } from '@components/ui/input'
import { ParamInputComponent } from './param-input.types'
import { useEffect } from 'react'

export const StringParamInput: ParamInputComponent<string, { placeholder?: string; unknownType?: boolean }> = ({
  onChange,
  placeholder,
  arg,
  unknownType,
}) => {
  useEffect(() => {
    if (arg === undefined) onChange({ valid: true, value: '' })
  }, [arg, onChange])

  return (
    <Input
      placeholder={placeholder}
      value={arg ? (typeof arg.value === 'string' ? arg.value : JSON.stringify(arg.value)) : ''}
      onChange={e => {
        // we know this is definitely a string
        if (!unknownType) {
          onChange({ value: e.target.value, valid: true })
          return
        }
        try {
          // unknown type, might be object or array, try to parse
          const asJson = JSON.parse(e.target.value)
          if (typeof asJson === 'object') {
            onChange({ value: asJson, valid: true })
          } else {
            onChange({ value: e.target.value, valid: true })
          }
        } catch (err) {
          onChange({ value: e.target.value, valid: true })
        }
      }}
    />
  )
}

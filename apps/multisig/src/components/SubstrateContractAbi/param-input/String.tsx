import { Input } from '@components/ui/input'
import { ParamInputComponent } from './param-input.types'
import { useEffect } from 'react'

export const StringParamInput: ParamInputComponent<string, { placeholder?: string }> = ({
  onChange,
  placeholder,
  arg,
}) => {
  useEffect(() => {
    if (arg === undefined) onChange({ valid: true, value: '' })
  }, [arg, onChange])

  return (
    <Input
      placeholder={placeholder}
      value={arg?.value ?? ''}
      onChange={e => onChange({ value: e.target.value, valid: true })}
    />
  )
}

import { Switch } from '@components/ui/switch'
import { ParamInputComponent } from './param-input.types'
import { useEffect } from 'react'

export const Bool: ParamInputComponent<boolean> = ({ id, onChange, arg }) => {
  useEffect(() => {
    if (arg === undefined) onChange({ valid: true, value: false })
  }, [arg, onChange])

  return (
    <div className="flex items-center gap-[8px]">
      <Switch
        id={id}
        checked={arg?.value ?? false}
        onCheckedChange={checked => onChange({ valid: true, value: checked })}
      />
      <label htmlFor={id} className="text-offWhite">{`${arg?.value ?? false}`}</label>
    </div>
  )
}

import { BalanceInput } from '@components/BalanceInput'
import { ParamInputComponent } from './param-input.types'
import { useEffect } from 'react'

export const ContractBalanceInput: ParamInputComponent<string> = ({ onChange, chain, arg, param }) => {
  useEffect(() => {
    if (!arg) onChange({ valid: true, value: '0' })
  }, [arg, onChange])

  return (
    <BalanceInput
      chain={chain}
      onChange={val => {
        onChange({ valid: true, value: val.toString() })
      }}
    />
  )
}

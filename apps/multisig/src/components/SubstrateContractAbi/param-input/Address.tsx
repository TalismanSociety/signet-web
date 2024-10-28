import AddressInput from '@components/AddressInput'
import { ParamInputComponent } from './param-input.types'

import { useEffect, useState } from 'react'

export const AddressParamInput: ParamInputComponent<string> = ({ chain, onChange, arg }) => {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!arg) setQuery('')
  }, [arg])
  return (
    <div className="w-full">
      <AddressInput
        value={query}
        onChange={(addr, input) => {
          onChange({ value: addr?.toSs58(chain) ?? '', valid: !!addr })
          setQuery(addr?.toSs58(chain) ?? input)
        }}
        chain={chain}
        shouldIncludeContacts
        shouldIncludeSelectedMultisig
      />
      {arg?.value === '' && (
        <p className="text-red-500 text-[12px] mt-[8px] ml-[4px]">Please select or provide a valid address.</p>
      )}
    </div>
  )
}

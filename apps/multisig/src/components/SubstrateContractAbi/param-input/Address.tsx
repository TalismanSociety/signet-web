import AddressInput from '@components/AddressInput'
import { ParamInputComponent } from './param-input.types'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { useSelectedMultisig } from '@domains/multisig'
import { useEffect, useState } from 'react'

export const AddressParamInput: ParamInputComponent<string> = ({ chain, onChange, arg }) => {
  const [query, setQuery] = useState('')
  const [selectedMultisig] = useSelectedMultisig()
  const { addresses } = useKnownAddresses(selectedMultisig.id, { includeSelectedMultisig: true })

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
        addresses={addresses}
        chain={chain}
      />
      {arg?.value === '' && (
        <p className="text-red-500 text-[12px] mt-[8px] ml-[4px]">Please select or provide a valid address.</p>
      )}
    </div>
  )
}

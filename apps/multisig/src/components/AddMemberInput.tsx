import toast from 'react-hot-toast'
import AddressInput, { AddressWithName } from './AddressInput'
import { Address } from '../util/addresses'
import { useState } from 'react'
import { Plus } from '@talismn/icons'
import { Chain } from '@domains/chains'
import { Button } from './ui/button'

type Props = {
  onNewAddress: (a: Address) => void
  validateAddress?: (a: Address) => boolean
  addresses?: AddressWithName[]
  compactInput?: boolean
  chain?: Chain
}

export const AddMemberInput: React.FC<Props> = ({ chain, validateAddress, onNewAddress, addresses, compactInput }) => {
  const [addressInput, setAddressInput] = useState('')
  const [address, setAddress] = useState<Address | undefined>()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) {
      toast.error('Invalid SS58 address')
    } else {
      const isValid = validateAddress ? validateAddress(address) : true
      if (!isValid) return
      onNewAddress(address)
      setAddressInput('')
      setAddress(undefined)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      css={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
      }}
    >
      <AddressInput
        addresses={addresses}
        value={addressInput}
        compact={compactInput}
        chain={chain}
        onChange={(address, input) => {
          setAddressInput(input)
          setAddress(address)
        }}
      />

      <Button disabled={!address} variant="outline" type="submit" className="px-[12px] gap-[4px]">
        <Plus size={24} />
        <p css={{ marginTop: 4, marginLeft: 8 }}>Add</p>
      </Button>
    </form>
  )
}

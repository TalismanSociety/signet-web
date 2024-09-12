import toast from 'react-hot-toast'
import AddressInput, { AddressWithName } from './AddressInput'
import { Address } from '../util/addresses'
import { useState } from 'react'
import { Plus } from '@talismn/icons'
import { Chain } from '@domains/chains'
import { Button } from './ui/button'
import { useSelectedMultisig } from '@domains/multisig'

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
  const [error, setError] = useState<boolean>(false)
  const [multisig] = useSelectedMultisig()

  const isSelectedChainAccountEth = chain?.account === 'secp256k1'
  // // handles the case where a user is creating/importing a multisig, or is changing the settings of an existing one
  const isChainAccountEth = !!chain ? isSelectedChainAccountEth : multisig.isEthereumAccount

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

  const handleAddressChange = (address: Address | undefined, input: string) => {
    const isAddressMismatch = address && isChainAccountEth !== address.isEthereum

    setError(!!isAddressMismatch)
    setAddress(address)
    setAddressInput(input)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-[8px]">
      <AddressInput
        addresses={addresses}
        value={addressInput}
        compact={compactInput}
        chain={chain || multisig.chain}
        onChange={handleAddressChange}
        error={error}
      />

      <Button disabled={!address || error} variant="outline" type="submit" className="px-[12px] gap-[4px]">
        <Plus size={24} />
        <p css={{ marginTop: 4, marginLeft: 8 }}>Add</p>
      </Button>
    </form>
  )
}

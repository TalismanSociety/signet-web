import { useState } from 'react'
import { Button } from '@components/ui/button'
import Modal from '@components/Modal'
import { useInput } from '@hooks/useInput'
import { Address } from '@util/addresses'
import { useAddressBook, useCreateContact } from '../../domains/offchain-data'
import { useSelectedMultisig } from '../../domains/multisig'
import { Input } from '@components/ui/input'
import AddressInput from '@components/AddressInput'
import { useToast } from '@components/ui/use-toast'
import { getErrorString } from '@util/misc'
import useUpsertAddresses from '@domains/offchain-data/address-book/hooks/useUpsertAddresses'

type Props = {
  onClose?: () => void
  isOpen?: boolean
  isPaidPlan: boolean
}

export const AddContactModal: React.FC<Props> = ({ isOpen, onClose, isPaidPlan }) => {
  const nameInput = useInput('')
  const [address, setAddress] = useState<Address | undefined>(undefined)
  const { createContact, creating } = useCreateContact()
  const [selectedMultisig] = useSelectedMultisig()
  const { contactsByAddress } = useAddressBook()
  const { toast } = useToast()
  const { mutate } = useUpsertAddresses()

  const handleClose = () => {
    if (creating) return
    nameInput.onChange('')
    setAddress(undefined)
    onClose?.()
  }

  const handleCreateContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!address) return
    if (!isPaidPlan) {
      console.log('Handle create contact paid plan')
      return
    }
    try {
      const created = await createContact(address, nameInput.value, selectedMultisig.orgId)
      if (created) {
        handleClose()
      }
    } catch (e) {
      toast({
        title: 'Failed to add contact',
        description: getErrorString(e),
      })
    }
  }

  const disabled = !address || !nameInput.value
  const conflict = address ? !!contactsByAddress[address.toSs58()] : false

  return (
    <Modal isOpen={isOpen ?? false} width="100%" maxWidth={420} contentLabel="Add new contact">
      <h1 css={{ fontSize: 20, fontWeight: 700 }}>Add new contact</h1>
      <p css={{ marginTop: 8 }}>Saved contacts will be shared by all members of your multisig.</p>
      <form
        css={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}
        onSubmit={e => handleCreateContact(e)}
      >
        <Input placeholder="Contact Name" label="Name" {...nameInput} />
        <div className="w-full">
          <AddressInput
            leadingLabel="Address"
            onChange={newAddress => setAddress(newAddress)}
            chain={selectedMultisig.chain}
          />
          {conflict ? (
            <p className="text-gray-200 mt-[8px] ml-[12px] text-[14px]">Address already exists in address book.</p>
          ) : null}
        </div>
        <div
          css={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            button: {
              height: 56,
              p: { marginTop: 4 },
            },
          }}
        >
          <Button type="button" variant="outline" css={{ width: '100%' }} onClick={handleClose}>
            <p>Cancel</p>
          </Button>
          <Button css={{ width: '100%' }} disabled={disabled || creating || conflict} loading={creating}>
            <p>Save</p>
          </Button>
        </div>
      </form>
    </Modal>
  )
}

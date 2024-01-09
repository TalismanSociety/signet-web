import { useMemo } from 'react'
import { Button, TextInput } from '@talismn/ui'
import Modal from '@components/Modal'
import { useInput } from '@hooks/useInput'
import { Address } from '@util/addresses'
import { useAddressBook } from '@domains/offchain-data'

type Props = {
  onClose?: () => void
  isOpen?: boolean
}

export const AddCollaboratorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const addressInput = useInput('')

  const { contactsByAddress } = useAddressBook()

  const handleClose = () => {
    // if (creating) return
    addressInput.onChange('')
    onClose?.()
  }

  const parsedAddress = useMemo(() => {
    try {
      return Address.fromSs58(addressInput.value)
    } catch (e) {
      return false
    }
  }, [addressInput.value])

  const handleCreateContact = async () => {
    if (!parsedAddress) return
    // TODO: handle add to db
    // if (created) handleClose()
  }

  const disabled = !parsedAddress
  const conflict = parsedAddress ? !!contactsByAddress[parsedAddress.toSs58()] : false

  return (
    <Modal isOpen={isOpen ?? false} width="100%" maxWidth={420} contentLabel="Add new contact">
      <h1 css={{ fontSize: 20, fontWeight: 700 }}>Add new collaborator</h1>
      <p css={{ marginTop: 8 }}>
        Collaborators can draft transaction and read data in your vault (e.g. transaction description).
      </p>
      <form css={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <TextInput
          placeholder="Address"
          leadingLabel="Address"
          {...addressInput}
          leadingSupportingText={
            conflict ? (
              <p
                css={({ color }) => ({
                  color: color.lightGrey,
                  fontSize: 14,
                  marginLeft: 12,
                })}
              >
                Address already exists in address book.
              </p>
            ) : null
          }
        />
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
          <Button type="button" variant="outlined" css={{ width: '100%' }} onClick={handleClose}>
            <p>Cancel</p>
          </Button>
          <Button
            css={{ width: '100%' }}
            disabled={disabled || conflict}
            // loading={creating}
            onClick={handleCreateContact}
          >
            <p>Save</p>
          </Button>
        </div>
      </form>
    </Modal>
  )
}

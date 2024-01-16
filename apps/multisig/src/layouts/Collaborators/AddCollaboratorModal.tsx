import { useCallback, useState } from 'react'
import { Address } from '@util/addresses'
import { Button } from '@components/ui/button'
import { useSelectedMultisig } from '@domains/multisig'
import AddressInput from '@components/AddressInput'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import Modal from '@components/Modal'
import { useAddCollaborator } from '@domains/offchain-data'

type Props = {
  onClose?: () => void
  isOpen?: boolean
}

export const AddCollaboratorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [selectedMultisig] = useSelectedMultisig()
  const [address, setAddress] = useState<Address | undefined>()
  const { addresses } = useKnownAddresses(selectedMultisig.id)
  const { addCollaborator, adding } = useAddCollaborator()

  const handleClose = useCallback(() => {
    if (adding) return
    setAddress(undefined)
    onClose?.()
  }, [adding, onClose])

  const handleCreateContact = useCallback(async () => {
    if (!address) return
    // TODO: handle add to db
    const added = await addCollaborator(address)
    if (added) handleClose()
  }, [addCollaborator, address, handleClose])

  const disabled = !address
  const isCollaboratorConflict = address ? selectedMultisig.isCollaborator(address) : false
  const isSignerConflict = address ? selectedMultisig.isSigner(address) : false
  const conflict = isCollaboratorConflict || isSignerConflict

  return (
    <Modal
      className="!overflow-visible"
      isOpen={isOpen ?? false}
      width="100%"
      maxWidth={420}
      contentLabel="Add new collaborator"
    >
      <h1 className="text-[20px] font-bold">Add new collaborator</h1>
      <p className="mt-[8px]">
        Collaborators can draft transaction and read data in your vault (e.g. transaction description).
      </p>
      <div className="mt-[24px] flex flex-col gap-[24px]">
        <div className="w-full">
          <AddressInput onChange={setAddress} addresses={addresses} />
          {conflict ? (
            <p className="text-red-500 text-[12px] ml-[12px] mt-[4px]">
              {isCollaboratorConflict
                ? 'Already added as collaborator.'
                : isSignerConflict
                ? 'Signers cannot be added as collaborator.'
                : null}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-[8px]">
          <Button type="button" variant="outline" disabled={adding} onClick={handleClose}>
            <p>Cancel</p>
          </Button>
          <Button disabled={disabled || adding} loading={adding} onClick={handleCreateContact}>
            <p>Save</p>
          </Button>
        </div>
      </div>
    </Modal>
  )
}

import { useCallback, useState } from 'react'
import { Address } from '@util/addresses'
import { Button } from '@components/ui/button'
import { useSelectedMultisig } from '@domains/multisig'
import AddressInput from '@components/AddressInput'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import Modal from '@components/Modal'
import { useAddOrgCollaborator } from '@domains/offchain-data'

type Props = {
  onClose?: () => void
  isOpen?: boolean
}

export const AddCollaboratorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [selectedMultisig] = useSelectedMultisig()
  const [address, setAddress] = useState<Address | undefined>()
  const [error, setError] = useState<boolean>(false)
  const { addresses } = useKnownAddresses({ orgId: selectedMultisig.orgId })
  const { addCollaborator, adding } = useAddOrgCollaborator()

  const handleAddressChange = (address: Address | undefined) => {
    const isAddressMismatch = address && selectedMultisig.isEthereumAccount !== address.isEthereum

    setError(!!isAddressMismatch)
    setAddress(address)
  }

  const handleClose = useCallback(() => {
    if (adding) return
    setAddress(undefined)
    setError(false)
    onClose?.()
  }, [adding, onClose])

  const handleCreateContact = useCallback(async () => {
    if (!address) return
    const added = await addCollaborator(address, selectedMultisig.orgId)
    if (added) handleClose()
  }, [addCollaborator, address, handleClose, selectedMultisig.orgId])

  const isCollaboratorConflict = address ? selectedMultisig.isCollaborator(address) : false
  const isSignerConflict = address ? selectedMultisig.isSigner(address) : false
  const disabled = !address || isCollaboratorConflict || isSignerConflict
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
        Collaborators can draft transaction and read data in your multisig (e.g. transaction description).
      </p>
      <div className="mt-[24px] flex flex-col gap-[24px]">
        <div className="w-full">
          <AddressInput
            onChange={handleAddressChange}
            addresses={addresses}
            chain={selectedMultisig.chain}
            hasError={error}
          />
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
          <Button disabled={disabled || adding || error} loading={adding} onClick={handleCreateContact}>
            <p>Save</p>
          </Button>
        </div>
      </div>
    </Modal>
  )
}

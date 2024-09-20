import { CircularProgressIndicator, IconButton } from '@talismn/ui'
import { Copy, Trash } from '@talismn/icons'
import { Row, PaginationState } from '@tanstack/react-table'
import { Contact } from '@domains/offchain-data/address-book/types'
import { cn } from '@util/tailwindcss'
import useCopied from '@hooks/useCopied'
import { useDeleteContact } from '@domains/offchain-data'
import { useNavigate } from 'react-router-dom'
import { useSelectedMultisig } from '@domains/multisig'

interface Props {
  row: Row<Contact>
  hideCollaboratorActions: boolean
  isCsvImport: boolean
  pagination: PaginationState
  isLastItemInPage: boolean
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>
}

const ActionButtons = ({
  row,
  hideCollaboratorActions,
  isCsvImport,
  isLastItemInPage,
  pagination,
  setPagination,
}: Props) => {
  const { copy } = useCopied()
  const { deleteContact, deleting } = useDeleteContact()
  const navigate = useNavigate()
  const [selectedMultisig] = useSelectedMultisig()

  const handleAddressDeleteSuccess = () => {
    if (isLastItemInPage) {
      navigate('#1', { replace: true })
      setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex - 1 }))
    }
  }

  const addressTosS58 = row.original.address.toSs58(selectedMultisig.chain)
  return (
    <div
      className={cn('flex items-center flex-row w-[2rem] text-[#a5a5a5]', {
        'w-[5rem]': !hideCollaboratorActions && !isCsvImport,
      })}
      css={({ color }) => ({
        button: { color: color.lightGrey },
      })}
    >
      <IconButton onClick={() => copy(addressTosS58, 'Address copied!', addressTosS58)}>
        <Copy size={16} />
      </IconButton>
      {!hideCollaboratorActions && !isCsvImport && (
        <IconButton
          onClick={() => deleteContact(row.original.id, pagination, handleAddressDeleteSuccess)}
          disabled={deleting}
        >
          {deleting ? <CircularProgressIndicator size={16} /> : <Trash size={16} />}
        </IconButton>
      )}
    </div>
  )
}

export default ActionButtons

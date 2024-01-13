import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { Button } from '@components/ui/button'
import { Tooltip } from '@components/ui/tooltip'
import { useDeleteCollaborator } from '@domains/offchain-data'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { Trash } from '@talismn/icons'
import { CircularProgressIndicator } from '@talismn/ui'
import { Address } from '@util/addresses'
import { useCallback } from 'react'

export const CollaboratorRow: React.FC<{ teamId: string; userId: string; address: Address }> = ({
  teamId,
  userId,
  address,
}) => {
  const { contactByAddress } = useKnownAddresses(teamId, { includeContracts: true })
  const { deleteCollaborator, deleting } = useDeleteCollaborator()

  const handleDelete = useCallback(() => {
    deleteCollaborator(teamId, userId)
  }, [deleteCollaborator, teamId, userId])

  return (
    <div className="w-full bg-gray-900 p-[16px] rounded-[12px] flex items-center justify-between">
      <AccountDetails address={address} name={contactByAddress?.[address.toSs58()]?.name} />
      <Tooltip content="Remove collaborator">
        <Button size="icon" variant="ghost" onClick={handleDelete} disabled={deleting}>
          {deleting ? <CircularProgressIndicator size={16} /> : <Trash size={16} />}
        </Button>
      </Tooltip>
    </div>
  )
}

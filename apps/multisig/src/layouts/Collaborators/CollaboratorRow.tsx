import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { Button } from '@components/ui/button'
import { Tooltip } from '@components/ui/tooltip'
import { useUser } from '@domains/auth'
import { useDeleteCollaborator } from '@domains/offchain-data'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { Trash } from '@talismn/icons'
import { CircularProgressIndicator } from '@talismn/ui'
import { Address } from '@util/addresses'
import { useCallback } from 'react'

export const CollaboratorRow: React.FC<{ orgId: string; userId: string; address: Address }> = ({
  orgId,
  userId,
  address,
}) => {
  const { contactByAddress } = useKnownAddresses(orgId, { includeContracts: true })
  const { deleteCollaborator, deleting } = useDeleteCollaborator()
  const { isCollaborator } = useUser()

  const handleDelete = useCallback(() => {
    deleteCollaborator(orgId, userId)
  }, [deleteCollaborator, orgId, userId])

  return (
    <div className="w-full bg-gray-900 p-[16px] rounded-[12px] flex items-center justify-between">
      <div>
        <AccountDetails address={address} name={contactByAddress?.[address.toSs58()]?.name} withAddressTooltip />
      </div>
      {!isCollaborator && (
        <Tooltip content="Remove collaborator">
          <Button size="icon" variant="ghost" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgressIndicator size={16} /> : <Trash size={16} />}
          </Button>
        </Tooltip>
      )}
    </div>
  )
}

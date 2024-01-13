import { Button } from '@components/ui/button'
import { useSelectedMultisig } from '@domains/multisig'
import { useState } from 'react'
import { Layout } from '../../layouts/Layout'
import { AddCollaboratorModal } from './AddCollaboratorModal'
import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { Trash } from '@talismn/icons'
import { Tooltip } from '@components/ui/tooltip'

export const Collaborators: React.FC = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const [showAddModal, setShowAddModal] = useState(false)
  const { contactByAddress } = useKnownAddresses(selectedMultisig.id, { includeContracts: true })

  return (
    <Layout selected="Collaborators" requiresMultisig>
      <div className="flex flex-col py-[32px] px-[8%] gap-[32px] flex-1">
        <div className="w-full max-w-[680px]">
          <div className="w-full flex justify-between items-center">
            <h1 className="text-offWhite mt-[4px] font-bold text-[24px]">Collaborators</h1>
            <Button variant="outline" size="lg" onClick={() => setShowAddModal(true)}>
              Add Collaborator
            </Button>
          </div>
          <p className="mt-[8px]">
            Add non-signers as Collaborators, with access to view onchain and offchain information from this Vault and
            the ability to create draft transactions
          </p>
          <div className="mt-[32px] w-full">
            {selectedMultisig.collaborators.length === 0 ? (
              <div className="flex items-center justify-center bg-gray-900 rounded-[12px] w-full px-[16px] py-[32px]">
                Your vault does not have any collaborator yet.
              </div>
            ) : (
              <div className="grid gap-[12px]">
                {selectedMultisig.collaborators.map(({ id, address }) => (
                  <div className="w-full bg-gray-900 p-[16px] rounded-[12px] flex items-center justify-between">
                    <AccountDetails key={id} address={address} name={contactByAddress?.[address.toSs58()]?.name} />
                    <Tooltip content="Remove collaborator">
                      <Button size="icon" variant="ghost">
                        <Trash size={16} />
                      </Button>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <AddCollaboratorModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </Layout>
  )
}

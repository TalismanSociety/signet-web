import { Button } from '@components/ui/button'
import { useSelectedMultisig } from '@domains/multisig'
import { useState } from 'react'
import { Layout } from '../../layouts/Layout'
import { AddCollaboratorModal } from './AddCollaboratorModal'

export const Collaborators: React.FC = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const [showAddModal, setShowAddModal] = useState(false)
  return (
    <Layout selected="Collaborators requiresMultisig">
      <div className="flex flex-col py-[32px] px-[8%] gap-[32px] flex-1">
        <div className="w-full max-w-[620px]">
          <div className="w-full flex justify-between items-center">
            <h2 className="text-offWhite mt-[4px]">Collaborators</h2>
            <Button variant="outline" size="lg" onClick={() => setShowAddModal(true)}>
              Add Collaborator
            </Button>
          </div>
          <p className="mt-[8px]">
            Add non-signers as Collaborators, with access to view onchain and offchain information from this Vault and
            the ability to create draft transactions
          </p>
          <div className="mt-[32px] w-full">
            {selectedMultisig.users.length === 0 ? (
              <div className="flex items-center justify-center bg-gray-800 rounded-[12px] w-full px-[16px] py-[32px]">
                Your vault does not have any collaborator yet.
              </div>
            ) : (
              <div>{selectedMultisig.users.map(({ address }) => address.toSs58())}</div>
            )}
          </div>
        </div>
      </div>
      <AddCollaboratorModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </Layout>
  )
}

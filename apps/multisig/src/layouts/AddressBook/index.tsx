import { EyeOfSauronProgressIndicator, TextInput } from '@talismn/ui'
import { useAddressBook } from '@domains/offchain-data'
import { AddContactModal } from './AddContactModal'
import { useState, useMemo } from 'react'
import { useInput } from '@hooks/useInput'
import { useSelectedMultisig } from '@domains/multisig'
import { useRecoilValue } from 'recoil'
import { selectedAccountState } from '@domains/auth'

import AddressBookList from './components/AddressBookList'
import AddressBookHeader from './components/AddressBookHeader'
import AddressBookTable from './components/AddressBookTable'

export const AddressBook: React.FC = () => {
  const { contacts, loading: isContactsLoading } = useAddressBook()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const user = useRecoilValue(selectedAccountState)
  const [selectedMultisig] = useSelectedMultisig()
  const queryInput = useInput('')

  const isCollaborator = useMemo(
    () => (user ? selectedMultisig.isCollaborator(user.injected.address) : false),
    [selectedMultisig, user]
  )
  const filteredContacts = useMemo(
    () =>
      contacts?.filter(contact => {
        if (contact.name.toLowerCase().includes(queryInput.value.toLowerCase())) return true
        const genericAddress = contact.address.toSs58()
        const chainAddress = contact.address.toSs58(selectedMultisig.chain)
        return (
          genericAddress.toLowerCase().includes(queryInput.value.toLowerCase()) ||
          chainAddress.toLowerCase().includes(queryInput.value.toLowerCase())
        )
      }) ?? [],
    [contacts, queryInput.value, selectedMultisig.chain]
  )

  return (
    <>
      <div className="flex flex-1 md:px-[8%] md:py-[32px] p-[12px] px-0">
        <div css={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
          <AddressBookHeader
            onAddContact={() => setIsModalOpen(true)}
            vaultName={selectedMultisig.name}
            hideAddButton={isCollaborator}
          />
          {isContactsLoading && !contacts ? (
            <EyeOfSauronProgressIndicator />
          ) : !contacts?.length ? (
            <div css={({ color }) => ({ backgroundColor: color.surface, borderRadius: 12, padding: '32px 16px' })}>
              <p css={{ textAlign: 'center' }}>You have no saved contacts yet</p>
            </div>
          ) : (
            <div>
              <TextInput placeholder="Search by name or address..." {...queryInput} />
              <div
                css={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 24,
                  flexDirection: 'column',
                }}
              >
                <AddressBookTable hideCollaboratorActions={isCollaborator} />
                {/* <AddressBookList
                  filteredContacts={filteredContacts}
                  multisig={selectedMultisig}
                  isCollaborator={isCollaborator}
                /> */}
              </div>
            </div>
          )}
        </div>
      </div>
      <AddContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

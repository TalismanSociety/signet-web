import { CircularProgressIndicator, EyeOfSauronProgressIndicator, IconButton, TextInput, Tooltip } from '@talismn/ui'
import { Copy, Database, Plus, Trash } from '@talismn/icons'
import { Contact, useAddressBook, useDeleteContact } from '@domains/offchain-data'
import { AddContactModal } from './AddContactModal'
import { useState, useMemo } from 'react'
import { useInput } from '@hooks/useInput'
import { Multisig, useSelectedMultisig } from '@domains/multisig'
import Logomark from '@components/Logomark'
import { useRecoilValue } from 'recoil'
import { selectedAccountState } from '@domains/auth'
import useCopied from '@hooks/useCopied'
import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { CONFIG } from '@lib/config'
import { Button } from '@components/ui/button'

const Header: React.FC<{ onAddContact: () => void; vaultName: string; hideAddButton: boolean }> = ({
  onAddContact,
  vaultName,
  hideAddButton,
}) => (
  <div className="flex flex-col w-full">
    <div>
      <div className="flex items-center gap-[12px]">
        <h2 className="text-offWhite text-[24px] mt-[4px] font-bold">Address Book</h2>
        <Tooltip
          content={
            <p css={{ maxWidth: 350 }}>
              Your Address Book is currently hosted securely with Signet's Database. To find out more about Self
              Hosting, contact us at {CONFIG.CONTACT_EMAIL}
            </p>
          }
        >
          <div css={{ position: 'relative' }}>
            <Database size={20} />
            <Logomark css={{ position: 'absolute', top: 0, right: '-60%' }} size={12} />
          </div>
        </Tooltip>
      </div>
      <p>
        Share contacts securely with all signers of <span className="text-offWhite">{vaultName}</span>
      </p>
    </div>
    <div className="flex justify-end mt-[24px]">
      {/* <div css={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
        <p css={({ color }) => ({ color: color.offWhite })}>Contacts</p>
        <p>Manage contacts to share and edit with other Multisig members</p>
      </div> */}
      {!hideAddButton && (
        <Button variant="outline" className="h-max py-[8px]" size="lg" onClick={onAddContact}>
          <div className="flex items-center gap-[8px]">
            <Plus size={16} />
            <p className="mt-[4px]">Add Contact</p>
          </div>
        </Button>
      )}
    </div>
  </div>
)

const ContactRow: React.FC<{ contact: Contact; multisig: Multisig; hideCollaboratorActions: boolean }> = ({
  contact,
  multisig,
  hideCollaboratorActions,
}) => {
  const address = contact.address.toSs58(multisig.chain)
  const { deleteContact, deleting } = useDeleteContact()
  const { copy } = useCopied()

  return (
    <div
      key={contact.id}
      css={({ color }) => ({
        borderRadius: 16,
        display: 'flex',
        padding: 16,
        backgroundColor: color.surface,
        justifyContent: 'space-between',
      })}
    >
      <div className="flex items-center justify-start">
        <AccountDetails
          address={contact.address}
          name={contact.name}
          chain={multisig.chain}
          withAddressTooltip
          identiconSize={32}
          breakLine
          disableCopy
        />
      </div>
      <div
        css={({ color }) => ({
          display: 'flex',
          alignItems: 'center',
          button: { color: color.lightGrey },
        })}
      >
        <IconButton onClick={() => copy(address, 'Address copied!', address)}>
          <Copy size={16} />
        </IconButton>
        {!hideCollaboratorActions && (
          <IconButton onClick={() => deleteContact(contact.id)} disabled={deleting}>
            {deleting ? <CircularProgressIndicator size={16} /> : <Trash size={16} />}
          </IconButton>
        )}
      </div>
    </div>
  )
}

export const AddressBook: React.FC = () => {
  const { contacts } = useAddressBook()
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
        <div css={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 680 }}>
          <Header
            onAddContact={() => setIsModalOpen(true)}
            vaultName={selectedMultisig.name}
            hideAddButton={isCollaborator}
          />
          {contacts === undefined ? (
            <EyeOfSauronProgressIndicator />
          ) : contacts.length === 0 ? (
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
                {filteredContacts.map(contact => (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    multisig={selectedMultisig}
                    hideCollaboratorActions={isCollaborator}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <AddContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

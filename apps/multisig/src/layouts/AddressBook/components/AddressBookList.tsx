import { CircularProgressIndicator, IconButton } from '@talismn/ui'
import { Copy, Trash } from '@talismn/icons'
import { Multisig } from '@domains/multisig'
import { Contact, useDeleteContact } from '@domains/offchain-data'
import useCopied from '@hooks/useCopied'
import { AccountDetails } from '@components/AddressInput/AccountDetails'

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

const AddressBookList = ({
  filteredContacts,
  multisig,
  isCollaborator,
}: {
  filteredContacts: Contact[]
  multisig: Multisig
  isCollaborator: boolean
}) => {
  return (
    <>
      {filteredContacts.map(contact => (
        <ContactRow key={contact.id} contact={contact} multisig={multisig} hideCollaboratorActions={isCollaborator} />
      ))}
    </>
  )
}

export default AddressBookList

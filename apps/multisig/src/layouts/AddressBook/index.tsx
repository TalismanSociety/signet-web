import { useState, useMemo } from 'react'
import { EyeOfSauronProgressIndicator, TextInput } from '@talismn/ui'
import { useAddressBook } from '@domains/offchain-data'
import { AddContactModal } from './AddContactModal'
import { useInput } from '@hooks/useInput'
import { useSelectedMultisig } from '@domains/multisig'
import { useRecoilValue } from 'recoil'
import { selectedAccountState } from '@domains/auth'
import { CONFIG } from '@lib/config'
import { PaginationState } from '@tanstack/react-table'
import { usePage } from '@hooks/usePage'
import useGetPaginatedAddressesByOrgId from '@domains/offchain-data/address-book/hooks/useGetPaginatedAddressesByOrgId'
import { useSearchParams } from 'react-router-dom'
import { useDebounce } from '@hooks/useDebounce'

import AddressBookList from './components/AddressBookList'
import AddressBookHeader from './components/AddressBookHeader'
import AddressBookTable from './components/AddressBookTable'
import { userOrganisationsState } from '@domains/offchain-data'

export const AddressBook: React.FC = () => {
  const page = usePage()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: page - 1,
    pageSize: 10, // Showing more rows
  })

  const { contacts, loading: isContactsLoading } = useAddressBook()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const user = useRecoilValue(selectedAccountState)
  const orgs = useRecoilValue(userOrganisationsState)
  const [selectedMultisig] = useSelectedMultisig()
  const queryInput = useInput('')
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('search') || ''
  const search = useInput(query)

  const handleUrlUpdate = () => {
    if (search.value !== query) {
      setSearchParams({ search: search.value })
    }
  }

  const debouncedSearch = useDebounce(search.value, 500, handleUrlUpdate)

  const dataQuery = useGetPaginatedAddressesByOrgId(pagination, debouncedSearch)
  const selectedOrganisation = orgs?.find(o => o.id === selectedMultisig.orgId)

  const isPaidPlan = CONFIG.USE_PAYWALL ? selectedOrganisation?.plan.id !== 0 : true

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
      <div className="flex flex-1 md:px-[8%] md:pt-[32px] p-[12px] px-0">
        <div css={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
          <AddressBookHeader
            onAddContact={() => setIsModalOpen(true)}
            vaultName={selectedMultisig.name}
            hideAddButton={isCollaborator}
          />
          {isPaidPlan ? (
            <>
              <TextInput placeholder="Search by name or address..." {...search} />
              <AddressBookTable
                hideCollaboratorActions={isCollaborator}
                dataQuery={dataQuery.data}
                pagination={pagination}
                setPagination={setPagination}
              />
            </>
          ) : // Keeping this for now, but we should remove it once we have the new table and full backwards compatibility with free plans
          isContactsLoading && !contacts ? (
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
                <AddressBookList
                  filteredContacts={filteredContacts}
                  multisig={selectedMultisig}
                  isCollaborator={isCollaborator}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <AddContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

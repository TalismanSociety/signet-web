import { useState, useMemo } from 'react'
import { EyeOfSauronProgressIndicator, TextInput } from '@talismn/ui'
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

import AddressBookHeader from './components/AddressBookHeader'
import AddressBookTable from './components/AddressBookTable'
import { userOrganisationsState } from '@domains/offchain-data'
import { PaginatedAddresses } from '@domains/offchain-data/address-book/hooks/useGetPaginatedAddressesByOrgId'
import { useNavigate } from 'react-router-dom'

export const DEFAULT_PAGE_SIZE = 10
export const DEFAULT_CSV_STATE: PaginatedAddresses = { rows: [], pageCount: 0, rowCount: 0 }

export const AddressBook: React.FC = () => {
  const page = usePage()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: page - 1,
    pageSize: DEFAULT_PAGE_SIZE,
  })
  const [parsedCsv, setParsedCsv] = useState<PaginatedAddresses>(DEFAULT_CSV_STATE)

  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const user = useRecoilValue(selectedAccountState)
  const orgs = useRecoilValue(userOrganisationsState)
  const [selectedMultisig] = useSelectedMultisig()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('search') || ''
  const search = useInput(query)

  const handleUrlUpdate = () => {
    if (search.value !== query) {
      setSearchParams({ search: search.value })
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
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

  const handleCsvImportCancel = () => {
    setParsedCsv({ rows: [], pageCount: 0, rowCount: 0 })
    navigate('#1', { replace: true })
    setPagination({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE })
  }

  const handleCsvImportSuccess = (paginatedCsv: PaginatedAddresses) => {
    navigate('#1', { replace: true })
    setPagination({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE })
    setParsedCsv(paginatedCsv)
  }

  return (
    <>
      <div className="flex flex-1 md:px-[8%] md:pt-[32px] p-[12px] px-0">
        <div css={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
          <AddressBookHeader
            vaultName={selectedMultisig.name}
            hideAddButton={isCollaborator}
            parsedCsvRows={parsedCsv.rows}
            isPaidPlan={isPaidPlan}
            isCsvImport={!!parsedCsv.rowCount}
            handleCsvImportSuccess={handleCsvImportSuccess}
            onAddContact={() => setIsModalOpen(true)}
            setParsedCsv={setParsedCsv}
            setPagination={setPagination}
            handleCsvImportCancel={handleCsvImportCancel}
          />
          <TextInput placeholder="Search by name or address..." {...search} />
          {dataQuery.isLoading ? (
            <div className="flex items-center justify-center h-full">
              <EyeOfSauronProgressIndicator />
            </div>
          ) : (
            <AddressBookTable
              hideCollaboratorActions={isCollaborator}
              search={search.value}
              dataQuery={
                parsedCsv.rowCount
                  ? {
                      ...parsedCsv,
                      // Client side pagination for CSV import
                      rows: parsedCsv.rows.slice(
                        pagination.pageIndex * pagination.pageSize,
                        (pagination.pageIndex + 1) * pagination.pageSize
                      ),
                    }
                  : dataQuery.data
              }
              pagination={pagination}
              setPagination={setPagination}
              isCsvImport={!!parsedCsv.rowCount}
              isPaidPlan={isPaidPlan}
            />
          )}
        </div>
      </div>
      {isModalOpen && (
        <AddContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} isPaidPlan={isPaidPlan} />
      )}
    </>
  )
}

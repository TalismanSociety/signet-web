import { requestSignetBackend } from '@domains/offchain-data/hasura'
import { selectedAccountState } from '@domains/auth'
import { SignedInAccount } from '@domains/auth'
import { useRecoilValue } from 'recoil'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { PAGINATED_ADDRESSES_BY_ORG_ID } from '@domains/offchain-data/address-book/queries/queries'
import { useSelectedMultisig } from '@domains/multisig'
import { Address } from '@util/addresses'
import { Contact } from '../address-book'

export type ContactAddress = Contact & { address: string }

export type PaginatedAddresses = {
  rows: Contact[]
  pageCount: number
  rowCount: number
}

const fetchGraphQLData = async ({
  pagination,
  orgId,
  selectedAccount,
  search,
}: {
  pagination: { pageIndex: number; pageSize: number }
  orgId: string
  selectedAccount: SignedInAccount
  search: string
}): Promise<PaginatedAddresses> => {
  const { data } = await requestSignetBackend(
    PAGINATED_ADDRESSES_BY_ORG_ID,
    {
      orgId,
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: `%${search}%`,
    },
    selectedAccount
  )

  return {
    rows: data.address.map((row: ContactAddress) => ({ ...row, address: Address.fromSs58(row.address) })),
    pageCount: Math.ceil(data.address_aggregate.aggregate.count / pagination.pageSize),
    rowCount: data.address.length,
  }
}

const useGetPaginatedAddressesByOrgId = (pagination: { pageIndex: number; pageSize: number }, search: string) => {
  const selectedAccount = useRecoilValue(selectedAccountState)
  const [selectedMultisig] = useSelectedMultisig()
  return useQuery({
    queryKey: [selectedMultisig.id, pagination, search],
    queryFn: async () =>
      fetchGraphQLData({ pagination, orgId: selectedMultisig.orgId, selectedAccount: selectedAccount!, search }),
    placeholderData: keepPreviousData, // don't have 0 rows flash while changing pages/loading next page
    enabled: !!selectedAccount,
  })
}

export default useGetPaginatedAddressesByOrgId

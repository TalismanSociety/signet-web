import { useInfiniteQuery } from '@tanstack/react-query'
import { requestSignetBackend } from '@domains/offchain-data/hasura'
import { PAGINATED_ADDRESSES_BY_ORG_ID } from '@domains/offchain-data/address-book/queries/queries'
import { SignedInAccount } from '@domains/auth'
import { useRecoilValue } from 'recoil'
import { selectedAccountState } from '@domains/auth'
import { useSelectedMultisig } from '@domains/multisig'
import { ContactIO } from '../types'
import { Address } from '@util/addresses'
import { Contact } from '../types'

const PAGE_SIZE = 10

type PaginatedAddresses = {
  data: Contact[]
  nextPage?: number
}

const fetchGraphQLData = async ({
  orgId,
  selectedAccount,
  search,
  pageParam,
}: {
  orgId: string
  selectedAccount: SignedInAccount
  search: string
  pageParam: number
}): Promise<PaginatedAddresses> => {
  const { data } = await requestSignetBackend(
    PAGINATED_ADDRESSES_BY_ORG_ID,
    {
      orgId,
      limit: PAGE_SIZE,
      offset: pageParam * PAGE_SIZE,
      search: `%${search}%`,
    },
    selectedAccount
  )

  const pageCount = Math.ceil(data.address_aggregate.aggregate.count / ((pageParam + 1) * PAGE_SIZE))

  return {
    data:
      data.address?.map((contact: ContactIO) => ({
        ...contact,
        type: 'Contacts',
        address: Address.fromSs58(contact.address),
      })) ?? [],
    nextPage: pageParam < pageCount ? pageParam + 1 : undefined,
  }
}

export const useGetInfiniteAddresses = ({ search, isEnabled = true }: { search: string; isEnabled?: boolean }) => {
  const selectedAccount = useRecoilValue(selectedAccountState)
  const [selectedMultisig] = useSelectedMultisig()
  const { data, ...rest } = useInfiniteQuery({
    queryKey: ['infiniteAddresses', selectedMultisig.id, search],
    queryFn: async ({ pageParam = 0 }) =>
      fetchGraphQLData({
        orgId: selectedMultisig.orgId,
        selectedAccount: selectedAccount!,
        search,
        pageParam,
      }),
    enabled: isEnabled,
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      return lastPage.nextPage
    },
  })

  return { data: data?.pages.flatMap(page => page.data) || [], ...rest }
}

import { useInfiniteQuery } from '@tanstack/react-query'
import { requestSignetBackend } from '@domains/offchain-data/hasura'
import { PAGINATED_SUB_CATEGORIES_BY_ORG_ID } from '@domains/offchain-data/address-book/queries/queries'
import { SignedInAccount } from '@domains/auth'
import { useRecoilValue } from 'recoil'
import { selectedAccountState } from '@domains/auth'
import { useSelectedMultisig } from '@domains/multisig'

const PAGE_SIZE = 10

const fetchGraphQLData = async ({
  categoryId,
  selectedAccount,
  search,
  pageParam,
}: {
  categoryId: string
  selectedAccount: SignedInAccount
  search: string
  pageParam: number
}): Promise<any> => {
  const { data } = await requestSignetBackend(
    PAGINATED_SUB_CATEGORIES_BY_ORG_ID,
    {
      categoryId,
      limit: PAGE_SIZE,
      offset: pageParam * PAGE_SIZE,
      search: `%${search}%`,
    },
    selectedAccount
  )

  const pageCount = Math.ceil(data.sub_category_aggregate.aggregate.count / ((pageParam + 1) * PAGE_SIZE))

  return { data: data.sub_category, nextPage: pageParam < pageCount ? pageParam + 1 : undefined }
}

export const useGetInfiniteSubcategories = ({ categoryId, search }: { categoryId: string; search: string }) => {
  console.log({ categoryId })
  const selectedAccount = useRecoilValue(selectedAccountState)
  const [selectedMultisig] = useSelectedMultisig()
  const { data, ...rest } = useInfiniteQuery({
    queryKey: ['subcategories', categoryId, selectedMultisig.id, search],
    queryFn: async ({ pageParam = 0 }) =>
      fetchGraphQLData({
        categoryId,
        selectedAccount: selectedAccount!,
        search,
        pageParam,
      }),
    initialPageParam: 0,
    enabled: !!categoryId,
    getNextPageParam: (lastPage, pages) => {
      return lastPage.nextPage
    },
  })

  return { data: data?.pages.flatMap(page => page.data), ...rest }
}

import { useQueries } from '@tanstack/react-query'

const fetchReferendums = async ({ id }: { id: string }) => {
  const data = await fetch(`https://rococo.subsquare.io/api/gov2/referendums/${id}`).then(res => res.json())
  return data
}

interface UseGetReferendums {
  ids: string[]
}

export default function useGetReferendums({ ids }: UseGetReferendums) {
  return useQueries({
    queries: ids.map(id => ({
      queryKey: ['post', id],
      queryFn: () => fetchReferendums({ id }),
      enabled: !!id,
    })),
    combine: results => {
      return {
        data: results.map(result => result.data),
        pending: results.some(result => result.isPending),
        isLoading: results.some(result => result.isLoading),
      }
    },
  })
}

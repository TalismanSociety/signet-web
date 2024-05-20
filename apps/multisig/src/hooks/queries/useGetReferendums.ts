import { useQueries } from '@tanstack/react-query'
import { SupportedChainIds } from '@domains/chains/generated-chains'

// Use PartialRecord to create the supportedChains object
const supportedChains: Partial<Record<SupportedChainIds, string>> = {
  'polkadot': 'polkadot',
  'kusama': 'kusama',
  'acala': 'acala',
  'bifrost-polkadot': 'bifrost',
  'bifrost-kusama': 'bifrost-kusama',
  'hydradx': 'hydradx',
  'phala': 'phala',
  'khala': 'khala',
  'karura': 'karura',
  'kintsugi': 'kintsugi',
  // testnets
  'rococo-testnet': 'rococo',
}
// This only a partial Referendum interface
interface Referendum {
  title: string
  referendumIndex: number
}

const fetchReferendums = async ({ chain, id }: { chain: string | undefined; id: string }): Promise<Referendum> => {
  const data = await fetch(`https://${chain}.subsquare.io/api/gov2/referendums/${id}`).then(res => res.json())
  return data
}

interface UseGetReferendums {
  ids: string[]
  chainId: SupportedChainIds
}

export default function useGetReferendums({ ids, chainId }: UseGetReferendums) {
  const chain = supportedChains[chainId]

  return useQueries({
    queries: ids.map(id => ({
      queryKey: [chainId, { isChainSupported: !!chain }, id],
      queryFn: () => fetchReferendums({ chain, id }),
      enabled: !!id && !!chain,
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

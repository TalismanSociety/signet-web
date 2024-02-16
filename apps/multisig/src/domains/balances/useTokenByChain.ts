import { useApi } from '@domains/chains/pjs-api'
import { useMemo } from 'react'

export const useTokenByChain = (genesisHash: string) => {
  const { api } = useApi(genesisHash)

  return useMemo(() => {
    if (!api) return { loading: true }

    const chainProperties = api.registry.getChainProperties()
    if (!chainProperties) return { error: 'Chain Properties not available.' }
    const symbols = chainProperties?.tokenSymbol
    const decimals = chainProperties.tokenDecimals

    const [symbolText] = symbols.value.toArray()
    const symbol = symbolText?.toString()

    const [decimal] = decimals.value.toArray()
    return { symbol, decimal }
  }, [api])
}

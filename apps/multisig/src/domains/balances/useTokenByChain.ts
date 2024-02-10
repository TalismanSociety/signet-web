import { Rpc } from '@domains/chains'
import { useApi } from '@domains/chains/pjs-api'
import { useMemo } from 'react'

export const useTokenByChain = (chainRpcs: Rpc[]) => {
  const { api } = useApi(chainRpcs)

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

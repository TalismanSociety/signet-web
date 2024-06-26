import { useMemo } from 'react'
import { decodeCallData, filteredSupportedChains } from '../chains'
import { useApi } from '../chains/pjs-api'

export const useDecodedCalldata = (calldata: `0x${string}`, genesisHash?: string) => {
  const chain = filteredSupportedChains.find(chain => chain.genesisHash.toLowerCase() === genesisHash?.toLowerCase())
  const { api } = useApi(chain?.genesisHash ?? filteredSupportedChains[0]?.genesisHash ?? '')

  const decodedCalldata = useMemo(() => {
    if (!api || !chain) return undefined
    const extrinsic = decodeCallData(api, calldata)
    if (!extrinsic) return undefined

    return extrinsic.method.toHuman()
  }, [api, calldata, chain])

  return {
    loading: !genesisHash || (chain && !api),
    error: !!api && !!chain && !decodedCalldata,
    decodedCalldata,
  }
}

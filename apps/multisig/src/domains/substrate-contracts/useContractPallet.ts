import { ApiPromise } from '@polkadot/api'
import { useMemo } from 'react'

export const useContractPallet = (api?: ApiPromise) => {
  return useMemo(() => {
    if (!api)
      return {
        loading: true,
        getContractInfo: async () => {
          throw new Error('getContractInfo is called before api is ready')
        },
      }

    if (!api.query.contracts)
      return {
        supported: false,
        loading: false,
        getContractInfo: async () => {
          throw new Error('contracts pallet is not supported')
        },
      }

    return {
      supported: true,
      loading: false,
      getContractInfo: async (address: string) => api.query.contracts.contractInfoOf(address),
    }
  }, [api])
}

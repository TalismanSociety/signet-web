import { ApiPromise } from '@polkadot/api'
import { useMemo } from 'react'

type Output = {
  loading: boolean
  supported?: boolean
  getContractInfo: (address: string) => Promise<any>
}
export const useContractPallet = (api?: ApiPromise): Output => {
  return useMemo(() => {
    if (!api)
      return {
        loading: true,
        getContractInfo: async () => {
          console.warn('getContractInfo is called before api is ready')
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

import { ApiPromise, WsProvider } from '@polkadot/api'
import { atomFamily, selector, selectorFamily, useRecoilValueLoadable } from 'recoil'

import { supportedChains } from './supported-chains'
import { getErrorString } from '@util/misc'

// Grab the pjs api from a selector. The selector caches the result based on the given rpc, so an
// api will will only be created once per rpc.
export const pjsApiSelector = atomFamily({
  key: 'apis',
  default: selectorFamily({
    key: 'Api',
    get: (_genesisHash: string) => async (): Promise<ApiPromise> => {
      const { rpcs, chainName } = supportedChains.find(({ genesisHash }) => genesisHash === _genesisHash) || {
        rpcs: [],
      }

      // Return a dummy provider when rpcs are not known
      if (rpcs.length === 0) return ApiPromise.create({ provider: new WsProvider([]) })

      try {
        const api = await ApiPromise.create({ provider: new WsProvider(rpcs.map(({ url }) => url)) })
        await api.isReady
        return api
      } catch (e) {
        throw new Error(`Failed to connect to ${chainName} chain:` + getErrorString(e))
      }
    },
    dangerouslyAllowMutability: true,
  }),
  dangerouslyAllowMutability: true,
})

// returned map key is the genesisHash
export const allPjsApisSelector = selector({
  key: 'AllPjsApis',
  get: async ({ get }): Promise<Map<string, ApiPromise>> => {
    const entries: [string, ApiPromise][] = await Promise.all(
      supportedChains.map(async ({ genesisHash }) => {
        const api = get(pjsApiSelector(genesisHash))
        return [genesisHash, api]
      })
    )

    return new Map(entries)
  },
  dangerouslyAllowMutability: true, // pjs wsprovider mutates itself to track connection msg stats
})

export const useApi = (genesisHash: string) => {
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(genesisHash))

  return {
    api: apiLoadable.state === 'hasValue' ? apiLoadable.contents : undefined,
    loading: apiLoadable.state === 'loading',
    isReady: apiLoadable.contents?.isReady,
    isConnected: apiLoadable.contents?.isConnected,
  }
}

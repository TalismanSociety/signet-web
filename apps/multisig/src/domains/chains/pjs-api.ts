import { ApiPromise, WsProvider } from '@polkadot/api'
import { atom, atomFamily, selectorFamily, useRecoilValueLoadable } from 'recoil'

import { supportedChains } from './supported-chains'
import { getErrorString } from '@util/misc'

export const customRpcsAtom = atom<Map<string, string>>({
  key: 'customRpcs',
  default: new Map(),
})

const defaultPjsApiSelector = selectorFamily({
  key: 'defaultPjsApis',
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
})

export const customPjsApiSelector = selectorFamily({
  key: 'customApis',
  get: (rpcUrl: string) => async (): Promise<ApiPromise> => {
    try {
      const api = await ApiPromise.create({ provider: new WsProvider(rpcUrl) })
      await api.isReady
      return api
    } catch (e) {
      throw new Error(`Failed to connect to custom chain:` + getErrorString(e))
    }
  },
})

// Grab the pjs api from a selector. The selector caches the result based on the given rpc, so an
// api will will only be created once per rpc.
/** Returns ApiPromise for the provided genesis hash */
export const pjsApiSelector = atomFamily({
  key: 'apis',
  default: selectorFamily({
    key: 'Api',
    get:
      (_genesisHash: string) =>
      async ({ get }): Promise<ApiPromise> => {
        const chain = supportedChains.find(({ genesisHash }) => genesisHash === _genesisHash)
        const customRpcs = get(customRpcsAtom)
        const rpc = customRpcs.get(_genesisHash)

        let api: ApiPromise
        if (rpc) {
          api = await ApiPromise.create({ provider: new WsProvider(rpc) })
        } else {
          api = get(defaultPjsApiSelector(_genesisHash))
        }

        try {
          await api.isReady
          return api
        } catch (e) {
          throw new Error(`Failed to connect to ${chain?.chainName} chain:` + getErrorString(e))
        }
      },
    dangerouslyAllowMutability: true,
  }),
  dangerouslyAllowMutability: true,
})

export const pjsApiListSelector = selectorFamily<Record<string, ApiPromise>, string[]>({
  key: 'ApiList',
  get:
    (genesisHashes: string[]) =>
    async ({ get }) => {
      const apis: Record<string, ApiPromise> = {}
      const apisList = await Promise.all(genesisHashes.map(genesisHash => get(pjsApiSelector(genesisHash))))
      genesisHashes.forEach((genesisHash, index) => {
        apis[genesisHash] = apisList[index] as ApiPromise
      })
      return apis
    },
  dangerouslyAllowMutability: true,
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

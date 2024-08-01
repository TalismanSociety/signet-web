import { ApiPromise, WsProvider } from '@polkadot/api'
import { atom, atomFamily, selectorFamily, useRecoilValueLoadable } from 'recoil'

import { supportedChains } from './supported-chains'
import { getErrorString } from '@util/misc'
import { parseURL } from '@util/strings'
import persistAtom from '@domains/persist'
import { types, rpc, signedExtensions } from 'avail-js-sdk'
import { ApiOptions } from '@polkadot/api/types'

const RPC_PROVIDER = 'onfinality'

export const customRpcsAtom = atom<Record<string, string | undefined>>({
  key: 'customRpcs',
  default: {},
  effects_UNSTABLE: [persistAtom],
})

export const customExtensions: Record<
  string,
  { types: ApiOptions['types']; signedExtensions: ApiOptions['signedExtensions']; rpc: ApiOptions['rpc'] }
> = {
  'avail-turing-testnet': { types, signedExtensions, rpc },
}

const defaultPjsApiSelector = selectorFamily({
  key: 'defaultPjsApis',
  get: (_genesisHash: string) => async (): Promise<ApiPromise> => {
    const { rpcs, chainName, squidIds } = supportedChains.find(({ genesisHash }) => genesisHash === _genesisHash) || {
      rpcs: [],
    }

    // Return a dummy provider when rpcs are not known
    if (rpcs.length === 0) return ApiPromise.create({ provider: new WsProvider([]) })

    let opt: ApiOptions = {
      provider: new WsProvider(
        rpcs.map(({ url }) => (url.includes(RPC_PROVIDER) ? `${url}${process.env.REACT_APP_ON_FINALITY_API_KEY}` : url))
      ),
    }

    const customExtension = squidIds ? customExtensions[id] : undefined
    if (customExtension) {
      opt = {
        ...opt,
        ...customExtension,
      }
    }

    try {
      const api = await ApiPromise.create(opt)
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
      // validate url
      const parsedUrl = parseURL(rpcUrl)
      if (!parsedUrl) throw new Error('Invalid URL')
      if (!(parsedUrl.protocol === 'ws:' || parsedUrl.protocol === 'wss:'))
        throw new Error('Only websocket rpcs are supported at the moment.')

      // create the API with custom rpc
      const api = await ApiPromise.create({
        provider: new WsProvider(rpcUrl),
        throwOnConnect: true,
      })
      await api.isReady
      return api
    } catch (e) {
      console.error('Failed to connect to custom RPC: ', e)
      if (e instanceof Error) throw e
      throw new Error(
        'Failed to connect to custom RPC. Please make sure the RPC is working or check console log for details.'
      )
    }
  },
  dangerouslyAllowMutability: true,
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
        const customRpcs = get(customRpcsAtom)
        const rpc = customRpcs[_genesisHash]

        let api: ApiPromise
        if (rpc) {
          api = get(customPjsApiSelector(rpc))
        } else {
          api = get(defaultPjsApiSelector(_genesisHash))
        }

        return api
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

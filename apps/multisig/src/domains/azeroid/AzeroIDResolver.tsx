import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { resolveAddressToDomain, resolveDomainToAddress, alephzero, alephzeroTestnet } from '@azns/resolver-core'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { Address } from '@util/addresses'

type ResolverPromiseResolve = {
  address?: Address
  a0id?: string
}

const AzeroIDResolverContext = createContext({
  subscribe: (query: string | string[]) => {},
  addressToA0Id: {} as Record<string, string>,
  a0IdToAddress: {} as Record<string, Address>,
  resolveAsPromise: async (query: string) => {
    return { address: undefined, a0id: undefined } as ResolverPromiseResolve
  },
})

type Resolver = {
  initTime: number
  promise: Promise<ResolverPromiseResolve>
}

const isAzeroId = (query: string) => {
  const lower = query.toLowerCase()
  const isAzeroId = lower.endsWith('.azero')
  const isTzeroId = lower.endsWith('.tzero')
  if (!isAzeroId && !isTzeroId) return false
  return { isAzeroId, isTzeroId }
}

const resolveAzeroIDQuery = async (query: string, api: ApiPromise, testnetApi?: ApiPromise) =>
  new Promise<ResolverPromiseResolve>(async resolve => {
    try {
      const isAzero = isAzeroId(query)
      if (isAzero) {
        const { address: addressString } = await resolveDomainToAddress(query, {
          customApi: isAzero.isTzeroId ? testnetApi : api,
        })
        const address = addressString ? Address.fromSs58(addressString) : undefined
        if (!address) return resolve({ a0id: query })

        return resolve({
          address,
          a0id: query,
        })
      }

      const address = Address.fromSs58(query)
      if (!address) return resolve({})

      const testnetAzeroIdQuery = resolveAddressToDomain(query, { customApi: testnetApi })
      const azeroIdQuery = resolveAddressToDomain(query, { customApi: api })
      const [testnetAzeroId, azeroId] = await Promise.all([testnetAzeroIdQuery, azeroIdQuery])

      const a0id = azeroId.primaryDomain || testnetAzeroId.primaryDomain
      if (!a0id) return resolve({})
      resolve({ a0id, address })
    } catch (err) {
      console.error(err)
      resolve({})
    }
  })

const mainnetWsProvider = new WsProvider(alephzero.rpcUrls)
const testnetWsProvider = new WsProvider(alephzeroTestnet.rpcUrls)

export const AzeroIDResolverProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [api, setApi] = useState<ApiPromise>()
  const [testnetApi, setTestnetApi] = useState<ApiPromise>()
  const [subscribedQuery, setSubscribedQuery] = useState<string[]>([])
  const [resolvers, setResolvers] = useState<Record<string, Resolver>>({})
  const [addressToA0Id, setAddressToA0Id] = useState<Record<string, string>>({})
  const [a0IdToAddress, setA0IdToAddress] = useState<Record<string, Address>>({})

  useEffect(() => {
    if (!api) ApiPromise.create({ provider: mainnetWsProvider }).then(_api => _api.isReady.then(() => setApi(_api)))
  }, [api])

  useEffect(() => {
    if (!testnetApi)
      ApiPromise.create({ provider: testnetWsProvider }).then(_api => {
        _api.isReady.then(() => setTestnetApi(_api))
      })
  }, [testnetApi])

  const resolve = useCallback(() => {
    const toResolve = subscribedQuery.filter(query => !resolvers[query])
    if (toResolve.length === 0 || !api || !testnetApi) return // nothing new to resolve

    const newResolvers = toResolve.reduce(
      (acc, query) => ({
        ...acc,
        [query]: {
          initTime: Date.now(),
          promise: resolveAzeroIDQuery(query, api, testnetApi),
        },
      }),
      {} as Record<string, Resolver>
    )
    // mark new queries as resolving so they dont get resolved again
    setResolvers(prev => ({ ...prev, ...newResolvers }))
  }, [api, resolvers, subscribedQuery, testnetApi])

  useEffect(() => resolve(), [resolve])

  const subscribe = useCallback(
    (query: string | string[]) => {
      const newQueries = typeof query === 'string' ? [query] : query
      const uniqueNewQueries = newQueries.filter(query => !subscribedQuery.includes(query))
      if (uniqueNewQueries.length === 0) return // nothing new to subscribe to

      setSubscribedQuery(prev => [...prev, ...uniqueNewQueries.filter(q => !prev.includes(q))])
    },
    [subscribedQuery]
  )

  const resolveAsPromise = useCallback(
    async (query: string) => {
      if (!api) return { address: undefined, a0id: undefined }

      let address: Address | undefined
      let a0id: string | undefined
      if (isAzeroId(query)) {
        address = a0IdToAddress[query]
        a0id = query
      } else {
        const parsedAddress = Address.fromSs58(query)
        if (parsedAddress) {
          address = parsedAddress
          a0id = addressToA0Id[parsedAddress.toSs58()]
        }
      }

      if (address && a0id) return { address, a0id }
      const res = await resolveAzeroIDQuery(query, api!, testnetApi!)
      return res
    },
    [a0IdToAddress, addressToA0Id, api, testnetApi]
  )

  const checkResolvers = useCallback(async () => {
    Object.values(resolvers).forEach(async r => {
      if (!r.promise) return
      const res = await r.promise
      if (!res.a0id || !res.address) return
      setAddressToA0Id(prev => (res.a0id && res.address ? { ...prev, [res.address?.toSs58() ?? 'a']: res.a0id } : prev))
      setA0IdToAddress(prev => (res.a0id && res.address ? { ...prev, [res.a0id]: res.address ?? 'a' } : prev))
    })
  }, [resolvers])

  useEffect(() => {
    checkResolvers()
  }, [checkResolvers])

  return (
    <AzeroIDResolverContext.Provider value={{ subscribe, a0IdToAddress, addressToA0Id, resolveAsPromise }}>
      {children}
    </AzeroIDResolverContext.Provider>
  )
}

export const useAzeroID = () => {
  const { a0IdToAddress, addressToA0Id, subscribe, resolveAsPromise } = useContext(AzeroIDResolverContext)

  const resolve = useCallback(
    (query: string): ResolverPromiseResolve | undefined => {
      subscribe(query)
      if (isAzeroId(query)) {
        const address = a0IdToAddress[query]
        return address ? { address: address, a0id: query } : undefined
      }

      const a0id = addressToA0Id[query]
      const address = Address.fromSs58(query)
      return a0id && address ? { a0id, address } : undefined
    },
    [a0IdToAddress, addressToA0Id, subscribe]
  )

  return { resolve, resolveAsPromise, subscribe }
}

export const useAzeroIDPromise = () => {
  const { resolveAsPromise } = useAzeroID()
  const [resolving, setResolving] = useState(false)
  const [data, setData] = useState<ResolverPromiseResolve | undefined>(undefined)

  const resolve = useCallback(
    async (query: string) => {
      setData(undefined)
      if (!isAzeroId(query)) return
      try {
        setResolving(true)
        const res = await resolveAsPromise(query)
        console.log(res)
        setData(res)
      } catch (e) {
        console.error(e)
      } finally {
        setResolving(false)
      }
    },
    [resolveAsPromise]
  )

  const clear = useCallback(() => setData(undefined), [])

  return { resolve, resolving, data, clear }
}

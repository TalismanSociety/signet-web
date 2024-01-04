import { SupportedChainId, resolveAddressToDomain, resolveDomainToAddress } from '@azns/resolver-core'
import { useEffect, useState, useCallback } from 'react'
import { Address } from '@util/addresses'

export const getAzeroId = async (address: string) => {
  // const address = '5HTHJfRWtpt3mkQ2FEz6K72fLBj4xfXh4BKrK1zSKbv1CUj6'
  const [azero, tzero] = await Promise.all([
    resolveAddressToDomain(address, {
      chainId: SupportedChainId.AlephZero,
    }),
    resolveAddressToDomain(address, {
      chainId: SupportedChainId.AlephZeroTestnet,
    }),
  ])
  if (azero.error) console.error('AzeroID error', azero.error)
  if (tzero.error) console.error('TzeroID error', tzero.error)
  return azero.primaryDomain?.toUpperCase() ?? tzero.primaryDomain?.toUpperCase()
}
export const getAddressFromAzeroId = async (domain: string) => {
  const [azero, tzero] = await Promise.all([
    resolveDomainToAddress(domain, {
      chainId: SupportedChainId.AlephZero,
    }),
    resolveDomainToAddress(domain, {
      chainId: SupportedChainId.AlephZeroTestnet,
    }),
  ])
  if (azero.error) console.error('getAddressFromAzeroId AzeroID error', azero.error)
  if (tzero.error) console.error('getAddressFromAzeroId TzeroID error', tzero.error)
  return azero.address ?? tzero.address
}

// azero ids should always end with .azero or .tzero unless I'm missing some edge case here
export const isAzeroId = (addressOrAzeroId: string) => {
  const lowerCased = addressOrAzeroId.toLowerCase()
  return lowerCased.endsWith('.azero') || lowerCased.endsWith('.tzero')
}

// I think we can just have 1 function that automatically resolves both address and azero id
// this reduce the thinking overhead when trying to decide whether we should use resolveAzeroId or resolveAddress
export const resolveAzeroId = async (addressOrAzeroId: string, resolveAzeroIdOnly = false) => {
  let address: string | undefined
  let azeroId: string | undefined

  if (isAzeroId(addressOrAzeroId)) {
    azeroId = addressOrAzeroId
    // add resolveAddressOnly option if required, tho I cant think of a scenario yet where we need this
    address = (await getAddressFromAzeroId(azeroId)) ?? undefined
  } else {
    address = addressOrAzeroId
    // dont need to resolve azero ID if we only need the address
    if (!resolveAzeroIdOnly) azeroId = (await getAzeroId(address)) ?? undefined
  }

  return { address, azeroId }
}

export const useAzeroId = (anything: string, options?: { resolveDomainOnly?: boolean }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>()
  const [resolvedFor, setResolvedFor] = useState<string>()
  const [resolved, setResolved] = useState<{ resolvingAddress?: string; azeroId?: string }>({})

  const handleResolve = useCallback(async () => {
    const resolvingFor = anything
    setResolvedFor(resolvingFor)
    setLoading(true)
    try {
      const { address, azeroId } = await resolveAzeroId(resolvingFor, options?.resolveDomainOnly)
      // input may change while we're fetching, hence the resolved value is no longer for what we initially resolve for
      if (resolvingFor !== anything) return
      setResolved({ resolvingAddress: address, azeroId })
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [anything, options?.resolveDomainOnly])

  // invalidate loading state when `anything` is changed, so the next effect can be unblocked and trigger another fetch
  useEffect(() => {
    setLoading(false)
  }, [anything])

  useEffect(() => {
    // makes sure anything conforms to either AzeroId or Address
    // dont need to fetch again if we've already resolved for given input
    if ((isAzeroId(anything) || Address.fromSs58(anything)) && (anything === resolved || loading)) return
    handleResolve()
  }, [anything, handleResolve, loading, resolved])

  return { error, loading, resolvedFor, setResolvedFor, ...resolved }
}

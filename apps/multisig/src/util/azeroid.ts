import { SupportedChainId, resolveAddressToDomain, resolveDomainToAddress } from '@azns/resolver-core'
import { useEffect, useState, useCallback } from 'react'
import { Address } from '@util/addresses'

export const getAzeroId = async (address: string) => {
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

// azero ids should always end with .azero or .tzero
export const isAzeroId = (addressOrAzeroId: string) => {
  const lowerCased = addressOrAzeroId.toLowerCase()
  return lowerCased.endsWith('.azero') || lowerCased.endsWith('.tzero')
}

export const resolveAzeroId = async (addressOrAzeroId: string, resolveAzeroIdOnly = false) => {
  let address: string | undefined
  let azeroId: string | undefined

  if (isAzeroId(addressOrAzeroId)) {
    azeroId = addressOrAzeroId
    // add resolveAddressOnly option if required
    address = (await getAddressFromAzeroId(azeroId)) ?? undefined
    // reduce ws calls and disconnections
  } else if (Address.fromSs58(addressOrAzeroId)) {
    address = addressOrAzeroId
    // dont need to resolve azero ID if we only need the address
    if (!resolveAzeroIdOnly) azeroId = (await getAzeroId(address)) ?? undefined
  }
  // unsure uppercase
  if (azeroId) azeroId = azeroId.toUpperCase()
  return { address, azeroId }
}

export const useAzeroId = (anything: string, options: { resolveDomainOnly?: boolean }) => {
  const [oldValue, setOldValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>()
  const [resolvedFor, setResolvedFor] = useState<string>()
  const [resolved, setResolved] = useState<{ address?: string; azeroId?: string }>({})

  const handleResolve = useCallback(async () => {
    const resolvingFor = anything
    setResolvedFor(resolvingFor)
    setLoading(true)
    try {
      const { address, azeroId } = await resolveAzeroId(resolvingFor, options.resolveDomainOnly)
      // input may change while we're fetching, hence the resolved value is no longer for what we initially resolve for
      if (resolvingFor !== anything) return
      setResolved({ address, azeroId })
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [anything, options.resolveDomainOnly])

  // invalidate loading state when `anything` is changed, so the next effect can be unblocked and trigger another fetch
  useEffect(() => {
    if (oldValue !== anything) setOldValue(anything)
    setLoading(false)
  }, [anything, oldValue])

  useEffect(() => {
    if (oldValue === anything) return
    // makes sure anything conforms to either AzeroId or Address
    if (!(isAzeroId(anything) || Address.fromSs58(anything))) return
    // dont need to fetch again if we've already resolved for given input
    if (anything === resolved.address || anything === resolved.azeroId || loading) return
    handleResolve()
  }, [anything, handleResolve, loading, resolved, oldValue])

  return { error, loading, resolvedFor, ...resolved }
}

export const toAzeroDomainUrl = (azeroId: string) => {
  return `https://${azeroId}.id`
}

export const ShortenAzeroId = (azeroId: string) => {
  const [prefix, suffix] = azeroId.split('.')
  if (prefix && prefix.length > 6) {
    return `${prefix.slice(0, 6)}...${suffix}`
  } else {
    return azeroId
  }
}

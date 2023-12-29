import { SupportedChainId, resolveAddressToDomain, resolveDomainToAddress } from '@azns/resolver-core'

export const azeroResolver = async (address: string) => {
  const { primaryDomain, error } = await resolveAddressToDomain(address, {
    chainId: SupportedChainId.AlephZeroTestnet,
  })
  if (error) {
    console.error(error)
  }
  return primaryDomain
}

export const azeroResolverToAddress = async (domain: string) => {
  const { address, error } = await resolveDomainToAddress(domain, {
    chainId: SupportedChainId.AlephZeroTestnet,
  })
  if (error) {
    console.error(error)
  }
  return address
}

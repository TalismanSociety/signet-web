import { Address } from './addresses'
import { SupportedChainId, resolveAddressToDomain } from '@azns/resolver-core'

export const azeroResolver = async (address: Address) => {
  const { primaryDomain, error } = await resolveAddressToDomain('5EeXYRxqC9gZZHdypcquyM9CTRumMVoVFpbJsdE4dgaKiHof', {
    chainId: SupportedChainId.AlephZeroTestnet,
  })
  if (error) {
    console.error(error)
  }
  return primaryDomain
}

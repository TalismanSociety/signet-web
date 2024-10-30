import { useRecoilValueLoadable } from 'recoil'
import { Address } from '@util/addresses'
import { useMemo } from 'react'
import { Chain } from '@domains/chains'
import { bondedPoolsAtom } from '@domains/nomination-pools'

/**
 * Returns a nom pool which the given address has a role for.
 * Returns undefined while loading, null if the address has no role in any pool.
 */
export const useNomPoolsOf = (address: Address, chain: Chain) => {
  const bondedPools = useRecoilValueLoadable(bondedPoolsAtom(chain.genesisHash))

  return useMemo(() => {
    if (bondedPools.state !== 'hasValue') return undefined
    return bondedPools.contents.filter(pool => {
      if (!pool) return false
      return (
        pool.roles.root.isEqual(address) ||
        pool.roles.nominator.isEqual(address) ||
        pool.roles.depositor.isEqual(address) ||
        pool.roles.bouncer.isEqual(address)
      )
    })
  }, [address, bondedPools])
}

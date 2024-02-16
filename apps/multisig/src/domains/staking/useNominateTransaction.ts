import { useMemo } from 'react'
import { useSelectedMultisig } from '../multisig'
import { BondedPool } from './NomPoolsWatcher'
import { useApi } from '../chains/pjs-api'
import { Address } from '../../util/addresses'

export const useNominateTransaction = (
  address: Address,
  description: string,
  validators: string[],
  pool?: BondedPool
) => {
  const [multisig] = useSelectedMultisig()
  const { api } = useApi(multisig.chain.genesisHash)

  const extrinsic = useMemo(() => {
    if (!api) return undefined

    if (!api.tx.proxy || !api.tx.proxy.proxy) return console.warn('Proxy pallet not supported on this chain.')

    try {
      // if pool exists, create a nom pool nominate extrinsic
      if (pool) {
        if (!api.tx.nominationPools || !api.tx.nominationPools.nominate) {
          // pallet not supported! UI should've handled this case so users should never reach here
          return console.warn('nominate() does not exist in nominationPools pallet.')
        }
        return api.tx.nominationPools.nominate(pool.id, validators)
      }

      // if pool isn't provided, we will nominate with staking pallet as a nominator
      if (!api.tx.staking) return console.warn('nominate() does not exist in staking pallet.')

      // TODO: check that proxy address is same as address
      // if not same, this is a nested proxy call
      return api.tx.staking.nominate(validators)
    } catch (e) {
      console.error(e)
    }
    return undefined
  }, [api, pool, validators])

  return { extrinsic }
}

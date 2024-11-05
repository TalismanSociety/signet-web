import { useMemo } from 'react'
import { useSelectedMultisig } from '../multisig'
import { useApi } from '../chains/pjs-api'

export const useBondExtrinsic = (value: bigint) => {
  const [multisig] = useSelectedMultisig()
  const { api } = useApi(multisig.chain.genesisHash)

  const isSupported = useMemo(() => {
    if (!api) return undefined
    return Boolean(api.tx.staking && api.tx.staking.bond)
  }, [api])

  const extrinsic = useMemo(() => {
    if (!api) return undefined
    try {
      if (!api.tx.staking || !api.tx.staking.bond) throw new Error('staking.bond not supported')

      // we automatically set the value to 'Staked' for now to avoid UI overhead around managing bond configurations
      return api.tx.staking.bond(value, 'Staked')
    } catch (e) {
      console.error(e)
    }
    return undefined
  }, [api, value])

  return { extrinsic, isSupported }
}

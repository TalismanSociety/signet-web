import { useMemo } from 'react'
import { useSelectedMultisig } from '../multisig'
import { useApi } from '../chains/pjs-api'

export const useBondExtraExtrinsic = (value: bigint) => {
  const [multisig] = useSelectedMultisig()
  const { api } = useApi(multisig.chain.genesisHash)

  const extrinsic = useMemo(() => {
    if (!api) return undefined
    try {
      if (!api.tx.staking || !api.tx.staking.bondExtra) throw new Error('staking.bondExtra not supported')

      // we automatically set the value to 'Staked' for now to avoid UI overhead around managing bond configurations
      return api.tx.staking.bondExtra(value)
    } catch (e) {
      console.error(e)
    }
    return undefined
  }, [api, value])

  return { extrinsic }
}

import { useMemo } from 'react'
import { Chain } from '../chains'
import { useRecoilValueLoadable } from 'recoil'
import { nominationsAtom } from '@domains/nomination-pools'
import { Address } from '@util/addresses'

export type Nomination = {
  address: Address
}

export const useNominations = (
  chain: Chain,
  address?: string
): { nominations: Address[] | undefined; isReady: boolean } => {
  const nominationsLoadable = useRecoilValueLoadable(nominationsAtom(`${chain.genesisHash}-${address}`))

  const nominations = useMemo(
    () => (nominationsLoadable.state === 'hasValue' ? nominationsLoadable.contents : undefined),
    [nominationsLoadable.contents, nominationsLoadable.state]
  )

  return useMemo(
    () => ({
      nominations: nominations?.map(addressString => Address.fromSs58(addressString) as Address),
      isReady: nominations !== undefined,
    }),
    [nominations]
  )
}

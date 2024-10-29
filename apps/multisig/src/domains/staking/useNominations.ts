import { useMemo } from 'react'
import { Chain } from '../chains'
import { useRecoilValue, useRecoilValueLoadable } from 'recoil'
import { validatorsState } from './ValidatorsWatcher'
import { nominationsAtom } from '@domains/nomination-pools'

export type Nomination = {
  address: string
  name?: string
  subName?: string
}

export const useNominations = (
  chain: Chain,
  address?: string
): { nominations: Nomination[] | undefined; isReady: boolean } => {
  const nominationsLoadable = useRecoilValueLoadable(nominationsAtom(`${chain.genesisHash}-${address}`))
  const validators = useRecoilValue(validatorsState)

  const nominations = useMemo(
    () => (nominationsLoadable.state === 'hasValue' ? nominationsLoadable.contents : undefined),
    [nominationsLoadable.contents, nominationsLoadable.state]
  )

  return useMemo(
    () => ({
      nominations: nominations?.map(addressString => ({
        // dont need to parse to Address class because we don't need to convert this address between chains
        address: addressString,
        name: validators?.validators[addressString]?.name,
        subName: validators?.validators[addressString]?.subName,
      })),
      isReady: validators !== undefined && nominations !== undefined,
    }),
    [nominations, validators]
  )
}

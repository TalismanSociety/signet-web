import { Chain } from '@domains/chains'
import { identitySelector } from '@domains/chains/storage-getters'
import { Address } from '@util/addresses'
import { useEffect, useState } from 'react'
import { useRecoilValueLoadable } from 'recoil'

export const useOnchainIdentity = (address: Address, chain?: Chain) => {
  const [onchainIdentity, setOnchainIdentity] = useState<{ identity: string; subIdentity?: string }>()
  const identity = useRecoilValueLoadable(identitySelector(`${chain?.genesisHash}:${address.toSs58(chain)}`))

  useEffect(() => {
    if (onchainIdentity) return
    if (identity.state === 'hasValue' && identity.contents && identity.contents.identity.isSome) {
      const superIdentity = identity.contents.identity.value.info.display
      const subIdentity = identity.contents.subIdentity
      if (superIdentity.isRaw) {
        const superIdentityString = superIdentity.asRaw.toHuman()?.toString()
        if (superIdentityString) setOnchainIdentity({ identity: superIdentityString, subIdentity })
      }
    }
  }, [identity.contents, identity.state, onchainIdentity])

  return onchainIdentity
}

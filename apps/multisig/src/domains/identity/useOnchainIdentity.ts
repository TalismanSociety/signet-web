import { Chain } from '@domains/chains'
import { identitySelector } from '@domains/chains/storage-getters'
import { Address } from '@util/addresses'
import { useEffect, useState } from 'react'
import { useRecoilValueLoadable } from 'recoil'

export const useOnchainIdentity = (address: Address, chain?: Chain) => {
  const [onchainIdentity, setOnchainIdentity] = useState<string>()
  const identity = useRecoilValueLoadable(identitySelector(`${chain?.genesisHash}:${address.toSs58(chain)}`))

  useEffect(() => {
    if (onchainIdentity) return
    if (identity.state === 'hasValue' && identity.contents && identity.contents.isSome) {
      const display = identity.contents.value.info.display
      if (display.isRaw) setOnchainIdentity(display.asRaw.toHuman()?.toString())
    }
  }, [identity.contents, identity.state, onchainIdentity])

  return onchainIdentity
}

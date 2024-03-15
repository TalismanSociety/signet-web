import { Chain } from '@domains/chains'
import { identitySelector } from '@domains/chains/storage-getters'
import { Address } from '@util/addresses'
import { useEffect, useState } from 'react'
import { useRecoilValueLoadable } from 'recoil'
import { u8aToString, u8aUnwrapBytes } from '@polkadot/util'

export const useOnchainIdentity = (address: Address, chain?: Chain) => {
  const [resolveFor, setResolveFor] = useState<string>(`${chain?.genesisHash}:${address.toSs58(chain)}`)
  const [onchainIdentity, setOnchainIdentity] = useState<{
    identity: string
    subIdentity?: string
    verified: boolean
  }>()

  useEffect(() => {
    const newId = `${chain?.genesisHash}:${address.toSs58(chain)}`
    if (newId === resolveFor) return
    setResolveFor(newId)
    setOnchainIdentity(undefined)
  }, [address, chain, resolveFor])

  const identity = useRecoilValueLoadable(identitySelector(resolveFor))

  useEffect(() => {
    if (onchainIdentity) return
    if (identity.state === 'hasValue' && identity.contents && identity.contents.identity.isSome) {
      const verified = identity.contents.identity.value.judgements.some(
        judgement => judgement[1].isReasonable || judgement[1].isKnownGood
      )
      const superIdentity = identity.contents.identity.value.info.display
      const subIdentity = identity.contents.subIdentity
      if (superIdentity.isRaw) {
        const superIdentityString = u8aToString(u8aUnwrapBytes(superIdentity.asRaw.toString()))
        if (superIdentityString) setOnchainIdentity({ identity: superIdentityString, subIdentity, verified })
      }
    }
  }, [identity.contents, identity.state, onchainIdentity])

  return onchainIdentity
}

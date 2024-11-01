import { Chain } from '@domains/chains'
import { Address } from '@util/addresses'
import { useMemo } from 'react'
import { useRecoilValueLoadable } from 'recoil'
import { u8aToString, u8aUnwrapBytes } from '@polkadot/util'
import { identitySelector } from '.'

export const useOnchainIdentity = (address: Address, chain?: Chain) => {
  const resolveFor = useMemo(() => `${chain?.genesisHash}:${address.toSs58(chain)}`, [address, chain])
  const identity = useRecoilValueLoadable(identitySelector(resolveFor))

  return useMemo(() => {
    if (identity.state !== 'hasValue' || !identity.contents?.identity.isSome) return undefined

    const [registration] = identity.contents.identity.value
    const verified = registration.judgements?.some(judgement => judgement[1].isReasonable || judgement[1].isKnownGood)
    const superIdentity = registration.info?.display

    if (superIdentity?.isRaw) {
      const superIdentityString = u8aToString(u8aUnwrapBytes(superIdentity.asRaw.toString()))
      if (superIdentityString)
        return { identity: superIdentityString, subIdentity: identity.contents.subIdentity, verified }
    }

    return { identity: u8aToString(u8aUnwrapBytes(registration.info.display.asRaw.toString())), verified }
  }, [identity])
}

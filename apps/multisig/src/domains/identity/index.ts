import { supportedChains } from '@domains/chains'
import { pjsApiSelector } from '@domains/chains/pjs-api'
import { Address } from '@util/addresses'
import { atomFamily, selectorFamily } from 'recoil'
import { u8aToString, u8aUnwrapBytes } from '@polkadot/util'
import { peopleChains } from '@domains/chains/people-chains'

export const identitySelector = selectorFamily({
  key: 'identitySelector',
  get:
    (identifier: string) =>
    async ({ get }) => {
      const [genesisHash, identifierAddress] = identifier.split(':') as [string, string]
      if (genesisHash === 'undefined') return undefined

      const chain = supportedChains.find(chain => chain.genesisHash === genesisHash)
      if (!chain) throw Error(`couldnt find chain for genesis hash ${genesisHash}, this should never happen`)

      // if people chain is available, use people chain to fetch identity
      const peopleChain = peopleChains[chain.id as keyof typeof peopleChains]

      const api = get(pjsApiSelector(peopleChain.genesisHash ?? genesisHash))
      await api.isReady
      if (!api.query.identity || !api.query.identity.identityOf) return null

      const address = Address.fromSs58(identifierAddress)
      // identity pallet is only available for Substrate addresses
      if (!address || address.isEthereum) return null

      // get identity + superOf to check if user has set its own identity or has a super identity
      const [identity, superOf] = await Promise.all([
        api.query.identity.identityOf(address.bytes),
        api.query.identity.superOf(address.bytes),
      ])

      // anyone can be set as a sub identity without permission, we should make sure that sub identity
      // doesnt override the actual identity set by the address itself
      if (!identity.isSome && superOf.isSome) {
        const [superAddress, rawIdentity] = superOf.value
        const superIdentity = await api.query.identity.identityOf(superAddress)
        // super identity is valid, return both super and sub identity
        if (superIdentity.isSome) {
          // some identities are hex, we need to convert them to readable strings
          const subIdentity = u8aToString(u8aUnwrapBytes(rawIdentity.asRaw.toString()))
          return { identity: superIdentity, subIdentity }
        }
      }
      return { identity }
    },
  dangerouslyAllowMutability: true,
})

export const multiIdentityOfAtom = atomFamily({
  key: 'multiIdentityOfAtom',
  default: selectorFamily({
    key: 'multiIdentityOfAtom/Default',
    get:
      (genesisHashAndAddresses: string) =>
      async ({ get }) => {
        const [genesisHash, addressesString] = genesisHashAndAddresses.split('-')
        if (!genesisHash || !addressesString) throw new Error('Invalid parameters for multi identity')
        const addresses = addressesString.split(',')

        const chain = supportedChains.find(chain => chain.genesisHash === genesisHash)
        if (!chain) throw Error(`couldnt find chain for genesis hash ${genesisHash}, this should never happen`)

        // if people chain is available, use people chain to fetch identity
        const peopleChain = peopleChains[chain.id as keyof typeof peopleChains]
        const api = get(pjsApiSelector(peopleChain.genesisHash ?? genesisHash))

        if (!api.query.identity?.identityOf) return [] // not supported

        const allPromises = addresses.map(async address => get(identitySelector(`${genesisHash}:${address}`)))
        return Promise.all(allPromises)
      },
    dangerouslyAllowMutability: true,
  }),
  dangerouslyAllowMutability: true,
})

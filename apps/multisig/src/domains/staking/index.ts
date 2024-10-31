import { pjsApiSelector } from '@domains/chains/pjs-api'
import { multiIdentityOfAtom } from '@domains/identity'
import { Address } from '@util/addresses'
import { atomFamily, selectorFamily, useRecoilValueLoadable } from 'recoil'
import { u8aToString, u8aUnwrapBytes } from '@polkadot/util'
import { useMemo } from 'react'

export type Validator = {
  address: Address
  commission: number
}

export type ValidatorWithIdentity = Validator & { name?: string; subName?: string }

export const validatorsAtom = atomFamily({
  key: 'validatorsAtom',
  default: selectorFamily({
    key: 'validatorsAtom/Default',
    get:
      (genesisHash: string) =>
      async ({ get }) => {
        const api = get(pjsApiSelector(genesisHash))
        if (!api.query.staking?.validators) return {} // not supported

        const validatorsRaw = await api.query.staking.validators.entries()

        const validatorsMap: Record<string, Validator> = {}
        validatorsRaw.forEach(([key, value]) => {
          const address = Address.fromSs58(key.toHuman()!.toString())
          const commission = value.commission.toNumber()
          if (address)
            validatorsMap[address.toSs58()] = {
              address,
              commission,
            }
        })

        return validatorsMap
      },
    dangerouslyAllowMutability: true,
  }),
  dangerouslyAllowMutability: true,
})

export const validatorsWithIdentityAtom = atomFamily({
  key: 'validatorsWithIdentityAtom',
  default: selectorFamily({
    key: 'validatorsWithIdentityAtom/Default',
    get:
      (genesisHash: string) =>
      async ({ get }) => {
        const validators = get(validatorsAtom(genesisHash))

        const validatorsKeys = Object.keys(validators)
        const identities = get(multiIdentityOfAtom(genesisHash + '-' + validatorsKeys.join(',')))

        return validatorsKeys.reduce((acc, address, index) => {
          const identity = identities[index]
          const validator = validators[address]
          if (!validator) return acc // wtf?
          if (identity && identity.identity.isSome) {
            const identityUnwraped = identity.identity.unwrap()
            const [registration] = identityUnwraped
            const name = u8aToString(u8aUnwrapBytes(registration.info.display.asRaw.toString()))
            const subName = identity.subIdentity
            acc[address] = { ...validator, name, subName }
          } else {
            acc[address] = validator
          }
          return acc
        }, {} as Record<string, ValidatorWithIdentity>)
      },
    dangerouslyAllowMutability: true,
  }),
  dangerouslyAllowMutability: true,
})

export const useValidators = (genesisHash: string) => {
  const validatorsLoadable = useRecoilValueLoadable(validatorsAtom(genesisHash))
  const validatorsWithIdentityLoadable = useRecoilValueLoadable(validatorsWithIdentityAtom(genesisHash))

  // identity takes some time to load. we return validators list as soon as we get them
  // identity will be updated "in the background"
  const validators = useMemo((): Record<string, ValidatorWithIdentity> | undefined => {
    if (validatorsLoadable.state !== 'hasValue') return undefined
    if (validatorsWithIdentityLoadable.state !== 'hasValue') return validatorsLoadable.contents
    return validatorsWithIdentityLoadable.contents
  }, [
    validatorsLoadable.contents,
    validatorsLoadable.state,
    validatorsWithIdentityLoadable.contents,
    validatorsWithIdentityLoadable.state,
  ])

  return {
    validators,
    loading: validatorsLoadable.state === 'loading',
    identityLoading: validatorsWithIdentityLoadable.state === 'loading',
  }
}

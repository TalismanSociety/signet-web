import { atom, atomFamily, selectorFamily } from 'recoil'
import { pjsApiSelector } from '../chains/pjs-api'
import { Address } from '../../util/addresses'
import { ApiPromise } from '@polkadot/api'
import type { StorageKey, u32 } from '@polkadot/types'
import BigNumber from 'bignumber.js'
import { BN, bnToU8a, stringToU8a, u8aConcat } from '@polkadot/util'

export type BondedPool = {
  id: number
  memberCounter: number
  points: bigint
  roles: {
    depositor: Address
    root: Address
    nominator: Address
    bouncer: Address
  }
  stash: Address
  reward: Address
  state: 'Open' | 'Destroying' | 'Blocked'
  metadata?: string
}

type BondedPoolRaw = {
  memberCounter: string
  points: string
  roles: {
    depositor: string
    root: string
    nominator: string
    bouncer: string
  }
  state: 'Open' | 'Destroying' | 'Blocked'
}

export const EmptyH256 = new Uint8Array(32)
export const ModPrefix = stringToU8a('modl')
export const U32Opts = { bitLength: 32, isLe: true }

const getPoolId = (raw: StorageKey<[u32]>): number => {
  const idRaw = raw.toHuman()
  if (Array.isArray(idRaw) && idRaw[0]) {
    return +idRaw[0]
  }
  return 0
}

const createAccount = (api: ApiPromise, poolId: BigNumber, index: number): string => {
  return api.registry
    .createType(
      'AccountId32',
      u8aConcat(
        ModPrefix,
        api.consts.nominationPools.palletId.toU8a() ?? new Uint8Array(0),
        new Uint8Array([index]),
        bnToU8a(new BN(poolId.toString()), U32Opts),
        EmptyH256
      )
    )
    .toString()
}

const createAccounts = (api: ApiPromise, poolId: number) => {
  const poolIdBigNumber = new BigNumber(poolId)
  return {
    stash: createAccount(api, poolIdBigNumber, 0),
    reward: createAccount(api, poolIdBigNumber, 1),
  }
}

export const bondedPoolsAtom = atomFamily({
  key: 'bondedPoolsAtom',
  default: selectorFamily({
    key: 'bondedPoolsAtomDefault',
    get:
      (chainGenesisHash: string) =>
      async ({ get }) => {
        const api = get(pjsApiSelector(chainGenesisHash))

        const pools = await api.query.nominationPools.bondedPools.entries()
        const ids = pools.map(([key]) => getPoolId(key))
        const metadata = await api.query.nominationPools.metadata.multi(ids)
        const metadataMulti = Object.fromEntries(metadata.map((m, i) => [ids[i], String(m.toHuman())]))

        return pools
          .map(([key, value]): BondedPool | null => {
            const id = getPoolId(key)

            const bondedPoolRaw = value.toHuman() as BondedPoolRaw
            const depositor = Address.fromSs58(bondedPoolRaw.roles.depositor)
            const root = Address.fromSs58(bondedPoolRaw.roles.root)
            const nominator = Address.fromSs58(bondedPoolRaw.roles.nominator)
            const bouncer = Address.fromSs58(bondedPoolRaw.roles.bouncer)

            if (id === undefined || !depositor || !root || !nominator || !bouncer) return null

            const { stash: stashString, reward: rewardString } = createAccounts(api, id)
            const stash = Address.fromSs58(stashString)
            const reward = Address.fromSs58(rewardString)
            if (!stash || !reward) return null

            const metadata = metadataMulti[id]

            const pool = {
              id,
              memberCounter: +bondedPoolRaw.memberCounter.replaceAll(',', ''),
              points: BigInt(bondedPoolRaw.points.replaceAll(',', '')),
              roles: {
                depositor,
                root,
                nominator,
                bouncer,
              },
              stash,
              reward,
              state: bondedPoolRaw.state,
              metadata: metadata === '' ? undefined : metadata,
            }
            return pool
          })
          .filter((pool): pool is BondedPool => pool !== null)
      },
  }),
})

export const selectedPoolIdAtom = atom<number | undefined>({
  key: 'selectedPoolIdAtom',
  default: undefined,
})

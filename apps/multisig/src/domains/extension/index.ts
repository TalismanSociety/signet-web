import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { Address } from '@util/addresses'
import { atom } from 'recoil'

import persistAtom from '../persist'
import persist from '../persist'

export type InjectedAccount = {
  address: Address
  a0Id?: string
} & Omit<InjectedAccountWithMeta, 'address'>

export type AddressAzeroIdMap = {
  [key: string]: string | undefined
}

export const accountsState = atom<InjectedAccount[]>({
  key: 'Accounts',
  default: [],
})

export const accountsAzeroIdState = atom<AddressAzeroIdMap>({
  key: 'accountsAzeroIdState',
  default: {} as AddressAzeroIdMap,
  effects_UNSTABLE: [persist],
})

export const extensionAllowedState = atom<boolean>({
  key: 'AllowExtension',
  default: false,
  effects_UNSTABLE: [persistAtom],
})

export const extensionLoadingState = atom<boolean>({
  key: 'ExtensionLoading',
  default: false,
})

export const extensionInitiatedState = atom<boolean>({
  key: 'ExtensionInitiated',
  default: false,
})

export { ExtensionWatcher } from './ExtensionWatcher'

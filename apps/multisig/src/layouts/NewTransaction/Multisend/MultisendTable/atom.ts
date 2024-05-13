import { atom } from 'recoil'
import { MultisendSend } from './MultisendTable'
import { AmountUnit } from '@components/AmountUnitSelector'
import { BaseToken } from '@domains/chains'

export const multisendSendsAtom = atom<MultisendSend[]>({
  key: 'multisendSends',
  default: [],
})

export const multisendAmountUnitAtom = atom<AmountUnit>({
  key: 'multisendAmountUnit',
  default: AmountUnit.Token,
})

export const multisendTokenAtom = atom<BaseToken | undefined>({
  key: 'multisendToken',
  default: undefined,
})

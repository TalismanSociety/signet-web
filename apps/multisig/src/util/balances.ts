import { ApiPromise } from '@polkadot/api'
import { FrameSystemAccountInfo } from '@polkadot/types/lookup'
import { BalanceFormatter } from '@talismn/balances'
import { BigMath } from '@talismn/util'

export type ComputedSubstrateBalance = {
  transferrable: BalanceFormatter
  stayAlive: BalanceFormatter
  reserved: BalanceFormatter
  locked: BalanceFormatter
}

export const computeSubstrateBalance = (api: ApiPromise, account: FrameSystemAccountInfo) => {
  const ed = api.consts.balances.existentialDeposit
  const reservedBN = account.data.reserved.toBigInt()
  const lockedBN = account.data.frozen.toBigInt()
  const untouchable = BigMath.max(lockedBN - reservedBN, 0n)
  const freeBN = account.data.free.toBigInt()
  const transferrableBN = BigMath.max(freeBN - untouchable, 0n)
  const stayAliveBN = freeBN - ed.toBigInt()

  const decimals = api.registry.chainDecimals[0] ?? 10

  const transferrable = new BalanceFormatter(transferrableBN, decimals)
  const stayAlive = new BalanceFormatter(stayAliveBN, decimals)
  const reserved = new BalanceFormatter(reservedBN, decimals)
  const locked = new BalanceFormatter(lockedBN, decimals)

  return { transferrable, stayAlive, reserved, locked }
}

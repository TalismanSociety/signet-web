import { TransactionType, VestingSchedule } from '@domains/offchain-data/metadata/types'
import { Address, parseCallAddressArg } from '@util/addresses'
import BN from 'bn.js'
import { TxDecoder } from './tx-decoders.types'

/**
 * schedule could be in two formats:
 * - { startingBlock: string, perBlock: string, locked: string }
 * - { start: string, period_count: string, perPeriod: string, period: string }
 */
const callToVestingSchedule = (schedule: any): VestingSchedule | null => {
  if (schedule.startingBlock && schedule.perBlock && schedule.locked) {
    const totalAmount = new BN(schedule.locked.replaceAll(',', ''))
    const period = totalAmount.div(new BN(schedule.perBlock.replaceAll(',', ''))).toNumber()
    return {
      start: +schedule.startingBlock.replaceAll(',', ''),
      period,
      totalAmount,
    }
  }

  if (schedule.start && schedule.periodCount && schedule.perPeriod) {
    const period = +`${schedule.periodCount}`.replaceAll(',', '')
    return {
      start: +schedule.start.replaceAll(',', ''),
      period,
      totalAmount: new BN(schedule.perPeriod.replaceAll(',', '')).mul(new BN(period)),
    }
  }
  return null
}

export const decodeVestedTransfer: TxDecoder = ({ metadata, methodArg, extrinsic, tokens, multisig }) => {
  if (methodArg?.section === 'vesting') {
    if (methodArg.method === 'vestedTransfer') {
      const { target, dest, schedule } = methodArg.args
      const targetAddress = Address.fromSs58(parseCallAddressArg(target ?? dest))
      const vestingSchedule = callToVestingSchedule(schedule)
      if (targetAddress && vestingSchedule) {
        return {
          decoded: {
            type: TransactionType.Transfer,
            recipients: [
              {
                address: targetAddress,
                balance: {
                  token: tokens.find(t => t.type === 'substrate-native')!,
                  amount: vestingSchedule.totalAmount,
                },
                vestingSchedule,
              },
            ],
          },
          description: metadata?.description ?? `Vested transfer to ${targetAddress.toShortSs58(multisig.chain)}`,
        }
      }
    }
  }

  return null
}

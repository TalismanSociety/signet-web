import { useApi } from '@domains/chains/pjs-api'
import { useMemo } from 'react'
import BN from 'bn.js'

export type VestingScheduleCreator = (totalAmount: BN, startBlock: number, period: number) => any

/**
 * There are mainly two types of vested transfer on Substrate:
 * - Substrate's native vesting pallet
 * - Orml vesting pallet
 *
 * Both pallets have different types for vesting schedule, this hook will find the right type for creating a vesting schedule
 */
export const useVestingScheduleCreator = (genesisHash: string) => {
  const { api } = useApi(genesisHash)

  const createVestingSchedule = useMemo((): VestingScheduleCreator | undefined | null => {
    if (!api) return undefined

    try {
      api.createType('OrmlVestingVestingSchedule', {})
      return (totalAmount: BN, startBlock: number, period: number) => {
        return api.createType('OrmlVestingVestingSchedule', {
          start: startBlock,
          period: 1,
          periodCount: period,
          perPeriod: totalAmount.div(new BN(period)),
        })
      }
    } catch (e) {
      try {
        api.createType('VestingInfo', {})
        return (totalAmount: BN, startBlock: number, period: number) => {
          if (period <= 0) return undefined
          return api.createType('VestingInfo', {
            locked: totalAmount,
            perBlock: totalAmount.div(new BN(period)),
            startingBlock: startBlock,
          })
        }
      } catch (e) {}
    }
  }, [api])

  return createVestingSchedule
}

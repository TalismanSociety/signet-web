import { useApi } from '@domains/chains/pjs-api'
import { useLatestBlockNumber } from '@domains/chains/useLatestBlockNumber'
import { expectedBlockTime } from '@domains/common/substratePolyfills'
import { VestingSchedule } from '@domains/multisig'
import { useMemo } from 'react'
import { Tooltip } from './ui/tooltip'
import { secondsToDuration } from '@util/misc'
import { cn } from '@util/tailwindcss'

export const VestingDateRange: React.FC<{
  chainGenesisHash: string
  vestingSchedule: VestingSchedule
  className?: string
}> = ({ chainGenesisHash, className, vestingSchedule }) => {
  const { api } = useApi(chainGenesisHash)
  const blockNumber = useLatestBlockNumber(chainGenesisHash)
  const blockTime = useMemo(() => {
    if (!api) return
    return expectedBlockTime(api)
  }, [api])

  const startDate = useMemo(() => {
    if (blockNumber === undefined || blockTime === undefined) return undefined

    const now = new Date()
    const blocksDiff = vestingSchedule.start - blockNumber
    const msDiff = blocksDiff * blockTime.toNumber()
    return new Date(now.getTime() + msDiff)
  }, [blockNumber, blockTime, vestingSchedule.start])

  const endDate = useMemo(() => {
    if (blockNumber === undefined || blockTime === undefined) return undefined

    const now = new Date()
    const blocksDiff = vestingSchedule.start + vestingSchedule.period - blockNumber
    const msDiff = blocksDiff * blockTime.toNumber()
    return new Date(now.getTime() + msDiff)
  }, [blockNumber, blockTime, vestingSchedule.period, vestingSchedule.start])

  const startDateString = startDate?.toLocaleDateString()
  const endDateString = endDate?.toLocaleDateString()
  const sameDay = startDateString === endDateString
  const duration = useMemo(() => {
    if (blockTime === undefined) return undefined
    return vestingSchedule.period * blockTime.toNumber()
  }, [blockTime, vestingSchedule.period])

  return (
    <Tooltip
      delayDuration={300}
      content={
        <p className="text-[14px]">
          {startDate?.toLocaleString()} &rarr; {endDate?.toLocaleString()}
        </p>
      }
    >
      <p className={cn('text-right text-offWhite text-[14px] cursor-default', className)}>
        {sameDay ? `${startDateString}, ` : ''}
        {sameDay ? `≈${startDate?.toLocaleTimeString()}` : startDateString} &rarr;{' '}
        {sameDay ? `≈${endDate?.toLocaleTimeString()}` : endDate?.toLocaleDateString()}
        {!!duration && (
          <span className="text-right text-gray-200 text-[14px]">&nbsp;(&asymp;{secondsToDuration(duration)})</span>
        )}
      </p>
    </Tooltip>
  )
}

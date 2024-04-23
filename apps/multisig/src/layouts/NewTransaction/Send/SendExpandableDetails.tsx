import { useApi } from '@domains/chains/pjs-api'
import { useLatestBlockNumber } from '@domains/chains/useLatestBlockNumber'
import { expectedBlockTime } from '@domains/common/substratePolyfills'
import { Transaction, VestingSchedule } from '@domains/multisig'
import { secondsToDuration } from '@util/misc'
import { useMemo } from 'react'

type Props = {
  t: Transaction
}

const VestingInfo: React.FC<Props & { vestingSchedule: VestingSchedule }> = ({ t, vestingSchedule }) => {
  const { api } = useApi(t.multisig.chain.genesisHash)
  const blockNumber = useLatestBlockNumber(t.multisig.chain.genesisHash)
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

  const duration = useMemo(() => {
    if (blockTime === undefined) return undefined
    return vestingSchedule.period * blockTime.toNumber()
  }, [blockTime, vestingSchedule.period])
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[14px]">Vesting Period</p>
        <p className="text-right text-offWhite text-[14px]">
          {startDate?.toLocaleDateString()} &rarr; {endDate?.toLocaleDateString()}
          {!!duration && (
            <span className="text-right text-gray-200 text-[14px]">&nbsp;(&asymp;{secondsToDuration(duration)})</span>
          )}
        </p>
      </div>
    </div>
  )
}

export const SendExpandableDetails: React.FC<Props> = ({ t }) => {
  const recipient = t.decoded?.recipients[0]
  if (!recipient) return null

  return <div>{recipient.vestingSchedule && <VestingInfo t={t} vestingSchedule={recipient.vestingSchedule} />}</div>
}

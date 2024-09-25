import { VestingDateRange } from '@components/VestingDateRange'
import { Transaction, VestingSchedule } from '@domains/offchain-data/metadata/types'

type Props = {
  t: Transaction
}

const VestingInfo: React.FC<Props & { vestingSchedule: VestingSchedule }> = ({ t, vestingSchedule }) => {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[14px]">Vesting Period</p>
      <VestingDateRange chainGenesisHash={t.multisig.chain.genesisHash} vestingSchedule={vestingSchedule} />
    </div>
  )
}

export const SendExpandableDetails: React.FC<Props> = ({ t }) => {
  const recipient = t.decoded?.recipients[0]
  if (!recipient || !recipient.vestingSchedule) return null

  return <VestingInfo t={t} vestingSchedule={recipient.vestingSchedule} />
}

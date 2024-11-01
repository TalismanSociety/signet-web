import AmountRow from '@components/AmountRow'
import { Transaction } from '@domains/offchain-data/metadata/types'

export const BondHeader: React.FC<{ t: Transaction }> = ({ t }) => {
  if (!t.decoded?.bond?.value) return null
  return (
    <div className="flex items-center gap-[8px]">
      <AmountRow balance={t.decoded.bond.value} />
    </div>
  )
}

import { AugmentedAccount } from '@domains/multisig'
import { Address } from '@util/addresses'
import { CancleOrNext } from '../common/CancelOrNext'
import AddMembers from './AddMembers'
import { Chain } from '@domains/chains'
import { ThresholdSettings } from './ThresholdSettings'
import { MIN_MULTISIG_MEMBERS, MIN_MULTISIG_THRESHOLD } from '@util/constants'

type Props = {
  chain: Chain
  header?: string
  members: AugmentedAccount[]
  threshold: number
  setAddedAccounts?: React.Dispatch<React.SetStateAction<Address[]>>
  onMembersChange?: React.Dispatch<React.SetStateAction<Address[]>>
  onThresholdChange: (threshold: number) => void
  onBack: () => void
  onNext: () => void
}

export const MultisigConfig: React.FC<Props> = ({
  chain,
  header,
  onBack,
  setAddedAccounts,
  onNext,
  onThresholdChange,
  threshold,
  members,
}) => {
  return (
    <div className="grid justify-center items-center gap-[48px] max-w-[540px] w-full">
      <div className="w-full">
        <h4 className="text-[14px] text-center font-bold mb-[4px]">{header}</h4>
        <h1>Multisig Configuration</h1>
      </div>
      <AddMembers setAddedAccounts={setAddedAccounts!} augmentedAccounts={members} chain={chain} />
      <ThresholdSettings membersCount={members.length} onChange={onThresholdChange} threshold={threshold} />
      <CancleOrNext
        block
        cancel={{ onClick: onBack, children: 'Back' }}
        next={{
          disabled:
            members.length < MIN_MULTISIG_MEMBERS || threshold < MIN_MULTISIG_THRESHOLD || threshold > members.length,
          onClick: onNext,
        }}
      />
    </div>
  )
}

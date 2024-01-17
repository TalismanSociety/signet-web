import { AugmentedAccount } from '@domains/multisig'
import { Address } from '@util/addresses'
import { CancleOrNext } from '../common/CancelOrNext'
import AddMembers from './AddMembers'
import { Chain } from '@domains/chains'
import { ThresholdSettings } from './ThresholdSettings'
import { useEffect, useMemo } from 'react'
import { useResolveAddressAzeroIdMap } from '@hooks/useResolveAddressAzeroIdMap'

type Props = {
  chain: Chain
  members: AugmentedAccount[]
  threshold: number
  onMembersChange: React.Dispatch<React.SetStateAction<Address[]>>
  onThresholdChange: (threshold: number) => void
  onBack: () => void
  onNext: () => void
}

export const MultisigConfig: React.FC<Props> = ({
  chain,
  onBack,
  onMembersChange,
  onNext,
  onThresholdChange,
  threshold,
  members,
}) => {
  const addresses = members.map(account => account.address.toSs58())
  const { readyQueue, queue, prevEntry, addressToAzeroId } = useResolveAddressAzeroIdMap()

  useEffect(() => {
    if (JSON.stringify(prevEntry) !== JSON.stringify(addresses)) {
      readyQueue(addresses)
    }
  }, [addresses, prevEntry, queue, readyQueue])

  const augmentedAccountsExtended: AugmentedAccount[] = useMemo(() => {
    return members.map(member => {
      const stringAddress = member.address.toSs58()
      return {
        ...member,
        a0Id: addressToAzeroId[stringAddress],
      }
    })
  }, [addressToAzeroId, members])

  return (
    <div
      css={{
        display: 'grid',
        justifyItems: 'center',
        alignItems: 'center',
        gap: 48,
        maxWidth: 540,
        width: '100%',
      }}
    >
      <h1>Multisig Configuration</h1>

      <AddMembers setAddedAccounts={onMembersChange} augmentedAccounts={augmentedAccountsExtended} chain={chain} />

      <ThresholdSettings membersCount={members.length} onChange={onThresholdChange} threshold={threshold} />

      <CancleOrNext
        block
        cancel={{ onClick: onBack, children: 'Back' }}
        next={{
          disabled: members.length <= 1 || threshold <= 1 || threshold > members.length,
          onClick: onNext,
        }}
      />
    </div>
  )
}

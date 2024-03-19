import { unknownConfirmedTransactionsState, useConfirmed } from '@domains/tx-history'
import { useRecoilValue } from 'recoil'
import { TransactionsList } from './TransactionsList'
import { useMemo } from 'react'
import { makeTransactionID } from '@util/misc'
import { useSelectedMultisig } from '@domains/multisig'
import { selectedTeamsState } from '@domains/offchain-data'

type Props = {
  value: string
}

export const ConfirmedTransactions: React.FC<Props> = ({ value }) => {
  const [selectedMultisig] = useSelectedMultisig()
  const selectedTeams = useRecoilValue(selectedTeamsState)
  const { transactions, loading, totalTransactions } = useConfirmed(selectedTeams ?? [])
  // const { transactions, loading } = useConfirmedTransactions()
  const unknownConfirmedTransactions = useRecoilValue(unknownConfirmedTransactionsState)

  const realUnknown = useMemo(
    () =>
      unknownConfirmedTransactions
        .filter(
          ut =>
            !transactions?.find(
              t =>
                t.executedAt &&
                ut === `${t.multisig.id}-${makeTransactionID(t.multisig.chain, t.executedAt.block, t.executedAt.index)}`
            )
        )
        .filter(id => id.startsWith(selectedMultisig.id)),
    [selectedMultisig.id, transactions, unknownConfirmedTransactions]
  )

  return (
    <TransactionsList
      value={value}
      loading={loading}
      transactions={transactions ?? []}
      indexing={realUnknown.length}
      totalTransactions={totalTransactions}
    />
  )
}

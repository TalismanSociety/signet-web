import { unknownConfirmedTransactionsState, useConfirmedTransactions } from '@domains/tx-history'
import { useRecoilValue } from 'recoil'
import { TransactionsList } from './TransactionsList'
import { useMemo } from 'react'

type Props = {
  value: string
}

export const ConfirmedTransactions: React.FC<Props> = ({ value }) => {
  const { transactions, loading } = useConfirmedTransactions()
  const unknownConfirmedTransactions = useRecoilValue(unknownConfirmedTransactionsState)

  const realUnknown = useMemo(() => {
    return unknownConfirmedTransactions.filter(ut => !transactions.find(t => t.executedAt && ut === t.id))
  }, [transactions, unknownConfirmedTransactions])

  return <TransactionsList value={value} loading={loading} transactions={transactions} indexing={realUnknown.length} />
}

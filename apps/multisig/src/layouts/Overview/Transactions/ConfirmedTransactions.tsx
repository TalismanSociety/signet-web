import { unknownConfirmedTransactionsState, useConfirmedTransactions } from '@domains/tx-history'
import { useRecoilValue } from 'recoil'
import { TransactionsList } from './TransactionsList'

type Props = {
  value: string
}

export const ConfirmedTransactions: React.FC<Props> = ({ value }) => {
  const { transactions, loading } = useConfirmedTransactions()
  const unknownConfirmedTransactions = useRecoilValue(unknownConfirmedTransactionsState)

  return (
    <TransactionsList
      value={value}
      loading={loading}
      transactions={transactions}
      indexing={unknownConfirmedTransactions.length}
    />
  )
}

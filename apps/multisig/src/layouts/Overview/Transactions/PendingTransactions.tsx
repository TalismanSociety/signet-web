import { TransactionsList } from './TransactionsList'
import usePendingTransactions from '@domains/multisig/usePendingTransactions'

type Props = {
  value: string
}

export const PendingTansactions: React.FC<Props> = ({ value }) => {
  const { data, isLoading } = usePendingTransactions()

  return <TransactionsList value={value} loading={isLoading && data.length === 0} transactions={data} />
}

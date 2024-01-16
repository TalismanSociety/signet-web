import { rawPendingTransactionsDependency } from '@domains/chains/storage-getters'
import { usePendingTransactions } from '@domains/multisig'
import { useEffect } from 'react'
import { useSetRecoilState } from 'recoil'
import { TransactionsList } from './TransactionsList'

type Props = {
  value: string
}

export const PendingTansactions: React.FC<Props> = ({ value }) => {
  const { transactions, loading } = usePendingTransactions()
  const setRawPendingTransactionDependency = useSetRecoilState(rawPendingTransactionsDependency)

  useEffect(() => {
    const interval = setInterval(() => {
      setRawPendingTransactionDependency(new Date())
    }, 5000)
    return () => clearInterval(interval)
  })

  console.log(
    transactions.map(t => ({
      hash: t.hash,
      when: t.rawPending?.onChainMultisig.when.toHuman(),
    }))
  )
  return <TransactionsList value={value} loading={loading} transactions={transactions} />
}

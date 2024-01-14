import { rawPendingTransactionsDependency } from '@domains/chains/storage-getters'
import { Transaction, selectedMultisigState, usePendingTransactions } from '@domains/multisig'
import { unknownConfirmedTransactionsState, useConfirmedTransactions } from '@domains/tx-history'
import { css } from '@emotion/css'
import { CircularProgressIndicator, EyeOfSauronProgressIndicator } from '@talismn/ui'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useRecoilValue, useSetRecoilState } from 'recoil'

import TransactionSummaryRow from './TransactionSummaryRow'
import { groupTransactionsByDay } from './utils'
import { changingMultisigConfigState } from '@domains/offchain-data/teams'
import { makeTransactionID } from '@util/misc'
import { TransactionSidesheet } from '@components/TransactionSidesheet'
import { useToast } from '@components/ui/use-toast'

enum Mode {
  Pending,
  History,
}

function extractHash(url: string) {
  const parts = url.split('/')
  const txIndex = parts.indexOf('tx')
  if (txIndex === -1 || txIndex + 1 >= parts.length) {
    return null
  }
  return parts[txIndex + 1]
}

const TransactionsList = ({ transactions }: { transactions: Transaction[] }) => {
  let location = useLocation().pathname
  const navigate = useNavigate()
  const groupedTransactions = useMemo(() => {
    return groupTransactionsByDay(transactions)
  }, [transactions])
  const _selectedMultisig = useRecoilValue(selectedMultisigState)
  const openTransaction = useMemo(
    () => transactions.find(t => t.hash === extractHash(location)),
    [transactions, location]
  )
  const multisig = openTransaction?.multisig || _selectedMultisig
  const setRawPendingTransactionDependency = useSetRecoilState(rawPendingTransactionsDependency)
  const { toast } = useToast()
  const setChangingMultisigConfig = useSetRecoilState(changingMultisigConfigState)
  const setUnknownTransactions = useSetRecoilState(unknownConfirmedTransactionsState)

  useEffect(() => {
    const interval = setInterval(() => {
      setRawPendingTransactionDependency(new Date())
    }, 5000)
    return () => clearInterval(interval)
  })

  // Handle if user clicks a link to a tx that doesn't exist for them
  useEffect(() => {
    if (!openTransaction && location.includes('tx')) {
      navigate('/overview')
    }
  }, [location, openTransaction, navigate])

  return (
    <div
      className={css`
        display: grid;
        gap: 16px;
      `}
    >
      {groupedTransactions.map(([day, transactions]) => (
        <div key={day}>
          <p>{day}</p>
          {transactions.map(t => {
            return (
              <motion.div key={t.id} whileHover={{ scale: 1.015 }} css={{ padding: '12px 16px', cursor: 'pointer' }}>
                <TransactionSummaryRow onClick={() => navigate(`/overview/tx/${t.hash}`)} t={t} shortDate={true} />
              </motion.div>
            )
          })}
        </div>
      ))}
      {groupedTransactions.length === 0 && <div>All caught up 🏖️</div>}
      <Routes>
        <Route
          path="/tx/:hash"
          element={
            <TransactionSidesheet
              calldata="0x"
              description={openTransaction?.description ?? ''}
              open={!!openTransaction}
              t={openTransaction}
              onApproved={({ result, executed }) => {
                if (executed) {
                  setChangingMultisigConfig(false)
                  setUnknownTransactions(prev => [
                    ...prev,
                    makeTransactionID(multisig.chain, result.blockNumber?.toNumber() ?? 0, result.txIndex ?? 0),
                  ])
                }
              }}
              onApproveFailed={e => {
                console.error(e)
                navigate('/overview')
                toast({
                  title: 'Failed to approve transaction',
                  description: e.message,
                })
              }}
              onClose={() => navigate('/overview')}
              onRejected={({ error }) => {
                navigate('/overview')
                if (error) {
                  console.error(error)
                  toast({
                    title: 'Failed to reject transaction',
                    description: error,
                  })
                }
              }}
            />
          }
        />
      </Routes>
    </div>
  )
}

const Transactions = () => {
  const { transactions: pendingTransactions, loading: pendingLoading } = usePendingTransactions()
  const { transactions: confirmedTransactions, loading: confirmedLoading } = useConfirmedTransactions()
  const unknownConfirmedTransactions = useRecoilValue(unknownConfirmedTransactionsState)

  const [mode, setMode] = useState(Mode.Pending)
  return (
    <section
      className={css`
        grid-area: transactions;
        background-color: var(--color-grey800);
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 24px;
      `}
    >
      <div
        className={css`
          display: flex;
          gap: 12px;
          font-weight: bold !important;
          > h2 {
            cursor: pointer;
          }
        `}
      >
        <h2
          onClick={() => setMode(Mode.Pending)}
          css={{ fontWeight: 'bold', color: mode === Mode.Pending ? 'var(--color-offWhite)' : '' }}
        >
          Pending
        </h2>
        <h2
          onClick={() => setMode(Mode.History)}
          css={{ fontWeight: 'bold', color: mode === Mode.History ? 'var(--color-offWhite)' : '' }}
        >
          History
        </h2>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {mode === Mode.History && unknownConfirmedTransactions.length > 0 && (
            <div className="flex items-center mb-[16px] gap-[8px]">
              <CircularProgressIndicator />
              <p className=" text-gray-100 mt-[3px]">
                Indexing {unknownConfirmedTransactions.length} new transactions...
              </p>
            </div>
          )}
          {(mode === Mode.Pending && pendingLoading && pendingTransactions.length === 0) ||
          (mode === Mode.History && confirmedLoading && confirmedTransactions.length === 0) ? (
            <div css={{ margin: '24px 0' }}>
              <EyeOfSauronProgressIndicator />
            </div>
          ) : (
            <TransactionsList transactions={mode === Mode.Pending ? pendingTransactions : confirmedTransactions} />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

export default Transactions

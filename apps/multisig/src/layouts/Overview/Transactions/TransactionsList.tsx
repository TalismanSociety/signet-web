import { Transaction, selectedMultisigState } from '@domains/multisig'
import { useMemo } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { useToast } from '@components/ui/use-toast'
import { unknownConfirmedTransactionsState } from '@domains/tx-history'
import { TabsContent } from '@components/ui/tabs'
import { AnimatePresence, motion } from 'framer-motion'
import TransactionSummaryRow from './TransactionSummaryRow'
import { TransactionSidesheet } from '@components/TransactionSidesheet'
import { makeTransactionID } from '@util/misc'
import { CircularProgressIndicator, EyeOfSauronProgressIndicator } from '@talismn/ui'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@components/ui/pagination'
import { Button } from '@components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePage } from '@hooks/usePage'

function extractHash(url: string, value: string) {
  const parts = url.split('/')
  const txIndex = parts.indexOf(`${value}-tx`)
  if (txIndex === -1 || txIndex + 1 >= parts.length) {
    return null
  }
  return parts[txIndex + 1]
}

export const TransactionsList = ({
  indexing,
  loading,
  transactions,
  value,
  totalTransactions,
}: {
  indexing?: number
  loading: boolean
  transactions: Transaction[]
  value: string
  totalTransactions?: number
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const _selectedMultisig = useRecoilValue(selectedMultisigState)
  const page = usePage()
  const totalPage = useMemo(() => (totalTransactions ? Math.ceil(totalTransactions / 10) : 1), [totalTransactions])

  const openTransaction = useMemo(
    () => transactions.find(t => (t.draft?.id ?? t.hash) === extractHash(location.pathname, value)),
    [transactions, location.pathname, value]
  )

  const multisig = openTransaction?.multisig || _selectedMultisig

  const { toast } = useToast()
  const setUnknownTransactions = useSetRecoilState(unknownConfirmedTransactionsState)

  return (
    <TabsContent value={value} className="flex-col flex-1 items-start gap-[16px] w-full [&[data-state=active]]:flex">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col flex-1 w-full"
        >
          {!!indexing && (
            <div className="flex items-center mb-[16px] gap-[8px]">
              <CircularProgressIndicator />
              <p className=" text-gray-100 mt-[3px]">Indexing {indexing} new transactions...</p>
            </div>
          )}
          {loading && transactions.length === 0 ? (
            <div className="mx-[24px]">
              <EyeOfSauronProgressIndicator />
            </div>
          ) : (
            <div className="gap-[20px] w-full flex flex-col flex-1">
              {transactions.length > 0 && (
                <div className="flex flex-col gap-[12px] mt-[4px] w-full">
                  {transactions.map(t => (
                    <motion.div
                      key={
                        t.draft?.id ??
                        (t.executedAt
                          ? makeTransactionID(t.multisig.chain, t.executedAt.block, t.executedAt.index)
                          : t.id)
                      }
                      whileHover={{ scale: 1.015 }}
                      className="cursor-pointer"
                    >
                      <TransactionSummaryRow
                        onClick={() =>
                          navigate(`/overview/${value}-tx/${t.draft?.id ?? t.hash}?tab=${value}&teamId=${multisig.id}`)
                        }
                        t={t}
                        showDraftBadge
                      />
                    </motion.div>
                  ))}
                </div>
              )}
              {transactions.length === 0 && <div>All caught up 🏖️</div>}
              <Routes>
                <Route
                  path={`/${value}-tx/:hash`}
                  element={
                    !loading && !openTransaction ? null : (
                      <TransactionSidesheet
                        calldata="0x"
                        description={openTransaction?.description ?? ''}
                        open={!!openTransaction}
                        t={openTransaction}
                        otherTxMetadata={{
                          contractDeployed: openTransaction?.decoded?.contractDeployment
                            ? {
                                abi: openTransaction.decoded.contractDeployment.abi,
                                name: openTransaction.decoded.contractDeployment.name,
                              }
                            : undefined,
                          changeConfigDetails: openTransaction?.decoded?.changeConfigDetails
                            ? {
                                newMembers: openTransaction.decoded.changeConfigDetails.signers,
                                newThreshold: openTransaction.decoded.changeConfigDetails.threshold,
                              }
                            : undefined,
                        }}
                        onApproved={({ result, executed }) => {
                          if (executed) {
                            setUnknownTransactions(prev => [
                              ...prev,
                              `${multisig.id}-${makeTransactionID(
                                multisig.chain,
                                result.blockNumber?.toNumber() ?? 0,
                                result.txIndex ?? 0
                              )}`,
                            ])
                          }
                        }}
                        onApproveFailed={e => {
                          console.error(e)
                          navigate(`/overview?tab=${value}&teamId=${multisig.id}`)
                          toast({
                            title: 'Failed to approve transaction',
                            description: e.message,
                          })
                        }}
                        onClose={() => {
                          navigate(`/overview?tab=${value}&teamId=${multisig.id}`)
                        }}
                        onRejected={({ error }) => {
                          navigate(`/overview?tab=${value}&teamId=${multisig.id}`)
                          if (error) {
                            console.error(error)
                            toast({
                              title: 'Failed to reject transaction',
                              description: error,
                            })
                          }
                        }}
                      />
                    )
                  }
                />
              </Routes>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <Pagination className="items-center justify-end">
        <p className="text-right text-offWhite text-[14px] mt-[3px] mr-[8px]">
          Page {page} of {totalPage}
        </p>
        <PaginationContent>
          <PaginationItem>
            {page === 1 ? (
              <Button size="icon" disabled variant="secondary">
                <ChevronLeft className="h-[16px] w-[16px]" />
              </Button>
            ) : (
              <PaginationPrevious href={`#${page - 1}`} />
            )}
          </PaginationItem>
          <PaginationItem>
            {page === totalPage ? (
              <Button size="icon" disabled variant="secondary">
                <ChevronRight className="h-[16px] w-[16px]" />
              </Button>
            ) : (
              <PaginationNext href={`#${page + 1}`} />
            )}
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </TabsContent>
  )
}

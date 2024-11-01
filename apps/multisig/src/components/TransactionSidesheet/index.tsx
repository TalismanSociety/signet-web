import { executingTransactionsState, useSelectedMultisig } from '@domains/multisig'
import { Transaction } from '@domains/offchain-data/metadata/types'
import { Button, SideSheet } from '@talismn/ui'
import { TransactionSidesheetHeader } from './TransactionSidesheetHeader'
import { useCallback, useMemo, useState } from 'react'
import TransactionDetailsExpandable from '../../layouts/Overview/Transactions/TransactionDetailsExpandable'
import TransactionSummaryRow from '../../layouts/Overview/Transactions/TransactionSummaryRow'
import { TransactionSidesheetApprovals } from './TransactionSidesheetApprovals'
import { TransactionSidesheetFooter, TransactionSidesheetLoading } from './TransactionSidesheetFooter'
import { useApi } from '@domains/chains/pjs-api'
import { useMultisigExtrinsicFromCalldata } from '@domains/multisig/useMultisigExtrinsicFromCalldata'
import { useCancelAsMulti } from '@domains/chains'
import { getErrorString } from '@util/misc'
import { SubmittableResult } from '@polkadot/api'
import { useDeleteDraftMetadata, useSaveDraftMetadata } from '@domains/offchain-data/tx-metadata-draft'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@components/ui/use-toast'
import { useRecoilState, useSetRecoilState } from 'recoil'
import { TxMetadata } from '@domains/offchain-data/metadata/types'
import { unknownConfirmedTransactionsState } from '@domains/tx-history'
import { makeTransactionID } from '@util/misc'
import { MIN_MULTISIG_THRESHOLD } from '@util/constants'
import useCopied from '@hooks/useCopied'
import { Check, Link } from '@talismn/icons'
import { stakingDependencyAtom } from '@domains/staking'

type TransactionSidesheetProps = {
  onApproved?: (res: { result: SubmittableResult; executed: boolean }) => void
  preventRedirect?: boolean
  onApproveFailed?: (err: Error) => void
  onClose?: () => void
  onRejected?: (res: { ok: boolean; error?: string }) => void
  onSaved?: () => void
  open?: boolean
  description: string
  calldata: `0x${string}`
  otherTxMetadata?: Pick<TxMetadata, 'changeConfigDetails' | 'contractDeployed'>
  t?: Transaction
  shouldSetUnknownTransaction?: boolean
}

export const TransactionSidesheet: React.FC<TransactionSidesheetProps> = ({
  description,
  calldata,
  otherTxMetadata,
  onApproved,
  onApproveFailed,
  onClose,
  onSaved,
  onRejected,
  open,
  t: submittedTx,
  preventRedirect,
  shouldSetUnknownTransaction,
}) => {
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [selectedMultisig] = useSelectedMultisig()
  const setUnknownTransactions = useSetRecoilState(unknownConfirmedTransactionsState)
  const { api } = useApi(selectedMultisig.chain.genesisHash)
  const { approve, estimatedFee, readyToExecute, t } = useMultisigExtrinsicFromCalldata(
    description,
    selectedMultisig,
    calldata,
    api,
    otherTxMetadata,
    submittedTx
  )

  const navigate = useNavigate()
  const { copy, copied } = useCopied()
  const { saveDraft, loading: savingDraft } = useSaveDraftMetadata()
  const { deleteDraft, loading: deletingDraft } = useDeleteDraftMetadata()
  const { cancelAsMulti, canCancel: canReject } = useCancelAsMulti(t)
  const [executingTransactions, setExecutingTransactions] = useRecoilState(executingTransactionsState)
  const setStakingDependency = useSetRecoilState(stakingDependencyAtom)

  const { toast } = useToast()
  const executing = useMemo(
    () => !t?.executedAt && executingTransactions.some(({ hash }) => hash === t?.hash),
    [executingTransactions, t?.executedAt, t?.hash]
  )

  const loading: TransactionSidesheetLoading = useMemo(
    () => ({
      savingDraft,
      deletingDraft,
      approving: approving || executing,
      rejecting,
      any: savingDraft || deletingDraft || approving || rejecting || executing,
    }),
    [approving, deletingDraft, executing, rejecting, savingDraft]
  )

  const handleClose = useCallback(() => {
    if (loading.any) return
    onClose?.()
  }, [loading.any, onClose])

  const handleApprove = useCallback(async () => {
    setApproving(true)
    let executing = false
    try {
      // executing tx may lead to tx missing in the pending list before it is finalized
      // hence we add to a temp list to keep the UI in place until it is finalized
      if (readyToExecute && t) {
        executing = true
        setExecutingTransactions(prev => [...prev, t])
      }
      const r = await approve()
      const extrinsicId = `${r.result.blockNumber}-${r.result.txIndex}`
      toast({
        title: r?.executed ? 'Transaction Executed!' : 'Transaction Approved!',
        description: `The transaction has been ${r?.executed ? 'executed' : 'approved'} at ${extrinsicId}`,
      })

      if (r.executed && (shouldSetUnknownTransaction || selectedMultisig.threshold === MIN_MULTISIG_THRESHOLD)) {
        setUnknownTransactions(prev => [
          ...prev,
          `${selectedMultisig.id}-${makeTransactionID(
            selectedMultisig.chain,
            r.result.blockNumber?.toNumber() ?? 0,
            r.result.txIndex ?? 0
          )}`,
        ])
      }

      onApproved?.(r)

      // update any dependencies
      if (r.executed) {
        setStakingDependency(x => x + 1)
      }
      // approving from draft tab, delete the draft
      // redirect if approving from a draft or if redirect isnt disabled
      if (!preventRedirect) navigate(`/overview?tab=${r.executed ? 'history' : 'pending'}`)
      if (t?.draft) await deleteDraft(t.draft.id, 'executed')
    } catch (e) {
      if (e === 'Cancelled') return
      onApproveFailed?.(e instanceof Error ? e : new Error(getErrorString(e)))
      onClose?.()
    } finally {
      if (executing) setExecutingTransactions(prev => prev.filter(({ hash }) => hash !== t?.hash))
      setApproving(false)
    }
  }, [
    approve,
    deleteDraft,
    navigate,
    onApproveFailed,
    onApproved,
    onClose,
    preventRedirect,
    readyToExecute,
    selectedMultisig.chain,
    selectedMultisig.id,
    selectedMultisig.threshold,
    setExecutingTransactions,
    setStakingDependency,
    setUnknownTransactions,
    shouldSetUnknownTransaction,
    t,
    toast,
  ])

  const handleReject = useCallback(async () => {
    if (!canReject) return

    // reject transaction
    setRejecting(true)
    try {
      await cancelAsMulti({
        onSuccess: () => {
          onRejected?.({ ok: true })
          setRejecting(false)
        },
        onFailure: err => {
          setRejecting(false)
          if (err === 'Cancelled') return
          onRejected?.({ ok: false, error: err })
        },
      })
    } catch (e) {
      onRejected?.({ ok: false, error: getErrorString(e) })
      setRejecting(false)
    }
  }, [canReject, cancelAsMulti, onRejected])

  const handleSaveDraft = useCallback(async () => {
    try {
      const saved = await saveDraft({
        callData: calldata,
        description,
        teamId: selectedMultisig.id,
        changeConfigDetails: otherTxMetadata?.changeConfigDetails,
        contractDeployed: otherTxMetadata?.contractDeployed,
      })

      if (saved.errors) {
        throw new Error(saved.errors[0]?.message)
      } else {
        if (onSaved) {
          onSaved()
        } else {
          if (!preventRedirect) navigate('/overview?tab=draft')
          toast({ title: 'Saved as draft!' })
        }
      }
    } catch (e) {
      onClose?.()
      toast({
        title: 'Failed to saved tx as draft',
        description: getErrorString(e),
      })
    }
  }, [
    calldata,
    description,
    navigate,
    onClose,
    onSaved,
    otherTxMetadata?.changeConfigDetails,
    otherTxMetadata?.contractDeployed,
    preventRedirect,
    saveDraft,
    selectedMultisig.id,
    toast,
  ])

  const handleDeleteDraft = useCallback(async () => {
    if (!t?.draft) return

    try {
      await deleteDraft(t.draft.id)
      onClose?.()
      toast({
        title: 'Draft deleted!',
      })
    } catch (e) {}
  }, [deleteDraft, onClose, t?.draft, toast])

  return (
    <SideSheet
      className="!max-w-[700px] !w-full !p-0 [&>header]:!px-[12px] [&>header]:!py-[12px] [&>header]:!mb-0 !bg-gray-800 flex flex-1 flex-col !overflow-hidden"
      open={open}
      title={<TransactionSidesheetHeader t={t} />}
      onRequestDismiss={handleClose}
    >
      <div className="flex-1 flex flex-col items-start justify-start overflow-hidden">
        {t && (
          <div className="px-[12px] w-full flex flex-col flex-1 gap-[32px] overflow-auto pb-[24px]">
            <TransactionSummaryRow t={t} />
            <div className="w-full">
              <div className="flex justify-between items-end pb-[16px]">
                <h4 className="mb-[8px] text-[16px]">Details</h4>
                <Button
                  css={{
                    padding: '4px 12px',
                  }}
                  variant="outlined"
                  className="flex gap-[8px]"
                  onClick={() => copy(window.location.href, 'Copied transaction URL')}
                >
                  <div className="flex items-center gap-[8px]">
                    <div className="mt-[4px]">Share</div>
                    {copied ? <Check size={16} /> : <Link size={16} />}
                  </div>
                </Button>
              </div>
              <TransactionDetailsExpandable t={t} />
            </div>
            {!t.executedAt && (
              <div className="w-full">
                <h4 className="mb-[8px] text-[16px]">Approvals</h4>
                <TransactionSidesheetApprovals t={t} />
              </div>
            )}
          </div>
        )}
        {!t?.executedAt && (
          <div className="mt-auto gap-[16px] grid pt-[24px] py-[32px] px-[16px] border-t border-t-gray-500 w-full">
            {t && (
              <TransactionSidesheetFooter
                onApprove={handleApprove}
                onCancel={handleClose}
                onReject={handleReject}
                onDeleteDraft={handleDeleteDraft}
                onSaveDraft={handleSaveDraft}
                readyToExecute={readyToExecute}
                t={t}
                fee={estimatedFee}
                loading={loading}
                canReject={canReject}
              />
            )}
          </div>
        )}
      </div>
    </SideSheet>
  )
}

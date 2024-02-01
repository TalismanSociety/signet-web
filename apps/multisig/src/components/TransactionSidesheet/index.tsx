import { Transaction, TxOffchainMetadata, executingTransactionsState, useSelectedMultisig } from '@domains/multisig'
import { SideSheet } from '@talismn/ui'
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
import { useRecoilState } from 'recoil'

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
  otherTxMetadata?: Pick<TxOffchainMetadata, 'changeConfigDetails'>
  t?: Transaction
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
}) => {
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig.chain.rpcs)
  const { approve, estimatedFee, readyToExecute, t } = useMultisigExtrinsicFromCalldata(
    description,
    selectedMultisig,
    calldata,
    api,
    otherTxMetadata,
    submittedTx
  )

  const navigate = useNavigate()
  const { saveDraft, loading: savingDraft } = useSaveDraftMetadata()
  const { deleteDraft, loading: deletingDraft } = useDeleteDraftMetadata()
  const { cancelAsMulti, canCancel: canReject } = useCancelAsMulti(t)
  const [executingTransactions, setExecutingTransactions] = useRecoilState(executingTransactionsState)

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

      onApproved?.(r)
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
    setExecutingTransactions,
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
      className="!max-w-[700px] !w-full !p-0 [&>header]:!px-[32px] [&>header]:!py-[16px] [&>header]:!mb-0 !bg-gray-800 flex flex-1 flex-col !overflow-hidden"
      open={open}
      title={<TransactionSidesheetHeader t={t} />}
      onRequestDismiss={handleClose}
    >
      <div className="flex-1 flex flex-col items-start justify-start overflow-hidden">
        {t && (
          <div className="px-[32px] w-full flex flex-col flex-1 gap-[32px] overflow-auto pb-[24px]">
            <TransactionSummaryRow t={t} shortDate={false} />
            <div className="w-full">
              <h4 className="mb-[8px] text-[16px]">Details</h4>
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
          <div className="mt-auto gap-[16px] grid pt-[24px] p-[32px] border-t border-t-gray-500 w-full">
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

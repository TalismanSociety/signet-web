import { Transaction, TxOffchainMetadata, useSelectedMultisig } from '@domains/multisig'
import { SideSheet } from '@talismn/ui'
import { TransactionSidesheetHeader } from './TransactionSidesheetHeader'
import { useCallback, useState } from 'react'
import TransactionDetailsExpandable from '../../layouts/Overview/Transactions/TransactionDetailsExpandable'
import TransactionSummaryRow from '../../layouts/Overview/Transactions/TransactionSummaryRow'
import { TransactionSidesheetApprovals } from './TransactionSidesheetApprovals'
import { TransactionSidesheetFooter } from './TransactionSidesheetFooter'
import { useApi } from '@domains/chains/pjs-api'
import { useMultisigExtrinsicFromCalldata } from '@domains/multisig/useMultisigExtrinsicFromCalldata'
import { useCancelAsMulti } from '@domains/chains'
import { getErrorString } from '@util/misc'
import { SubmittableResult } from '@polkadot/api'

type TransactionSidesheetProps = {
  onApproved?: (res: { result: SubmittableResult; executed: boolean }) => void
  onApproveFailed?: (err: Error) => void
  onClose?: () => void
  onRejected?: (res: { ok: boolean; error?: string }) => void
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
  onRejected,
  open,
  t: submittedTx,
}) => {
  const [loading, setLoading] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig.chain.rpcs)
  const { approve, approving, estimatedFee, readyToExecute, t } = useMultisigExtrinsicFromCalldata(
    description,
    selectedMultisig,
    calldata,
    api,
    otherTxMetadata,
    submittedTx
  )
  const { cancelAsMulti, canCancel: canReject } = useCancelAsMulti(t)

  const handleClose = useCallback(async () => {
    if (loading) return
    onClose?.()
    return
  }, [loading, onClose])

  const handleApprove = useCallback(async () => {
    setLoading(true)
    try {
      const r = await approve()
      onApproved?.(r)
    } catch (e) {
      if (e === 'Cancelled') return
      onApproveFailed?.(e instanceof Error ? e : new Error(getErrorString(e)))
    } finally {
      setLoading(false)
    }
  }, [approve, onApproveFailed, onApproved])

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

  const handleSaveDraft = useCallback(() => {
    setLoading(true)
    try {
      console.log('Saved draft')
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDeleteDraft = useCallback(() => {
    setLoading(true)
    try {
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }, [])

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
                rejecting={rejecting}
                t={t}
                fee={estimatedFee}
                loading={loading || approving}
                canReject={canReject}
              />
            )}
          </div>
        )}
      </div>
    </SideSheet>
  )
}

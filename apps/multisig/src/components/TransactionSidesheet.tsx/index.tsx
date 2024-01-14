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

type TransactionSidesheetProps = {
  onClose?: () => void
  onApproved?: () => void
  open?: boolean
  description: string
  calldata: `0x${string}`
  otherTxMetadata?: TxOffchainMetadata
  t?: Transaction
}

export const TransactionSidesheet: React.FC<TransactionSidesheetProps> = ({
  description,
  calldata,
  otherTxMetadata,
  onApproved,
  onClose,
  open,
  t: submittedTx,
}) => {
  const [loading, setLoading] = useState(false)
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig.chain.rpcs)
  const { approve, approving, estimatedFee, proxyExtrinsic, ready, readyToExecute, t } =
    useMultisigExtrinsicFromCalldata(description, selectedMultisig, calldata, api, otherTxMetadata, submittedTx)

  const handleClose = useCallback(() => {
    if (loading) return
    onClose?.()
  }, [loading, onClose])

  const handleApprove = useCallback(async () => {
    if (readyToExecute) {
      // TODO: execute transaction
    } else {
      // TODO: approve transaction
    }
    onApproved?.()
  }, [onApproved, readyToExecute])

  const handleSaveDraft = useCallback(() => {
    setLoading(true)
    try {
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
                onDeleteDraft={handleDeleteDraft}
                onSaveDraft={handleSaveDraft}
                readyToExecute={readyToExecute}
                t={t}
                fee={estimatedFee}
                loading={loading || approving}
              />
            )}
          </div>
        )}
      </div>
    </SideSheet>
  )
}

import { Button } from '@components/ui/button'
import { Checkbox } from '@components/ui/checkbox'
import { selectedAccountState } from '@domains/auth'
import { multisigDepositTotalSelector, tokenPriceState } from '@domains/chains'
import { accountsState } from '@domains/extension'
import { Balance, Transaction, TransactionType, usePendingTransactions, useSelectedMultisig } from '@domains/multisig'
import { Skeleton } from '@talismn/ui'
import { balanceToFloat, formatUsd } from '@util/numbers'
import { cn } from '@util/tailwindcss'

import { useCallback, useMemo, useState } from 'react'
import { useRecoilValue, useRecoilValueLoadable } from 'recoil'

export const SignerCta: React.FC<{
  canReject?: boolean
  onApprove: Function
  onCancel: Function
  onReject: Function
  onSaveDraft: Function
  readyToExecute: boolean
  rejecting: boolean
  fee?: Balance
  t: Transaction
  loading: boolean
}> = ({ canReject, onApprove, onCancel, onReject, onSaveDraft, fee, loading, readyToExecute, rejecting, t }) => {
  const extensionAccounts = useRecoilValue(accountsState)
  const [asDraft, setAsDraft] = useState(false)
  const { transactions: pendingTransactions, loading: pendingLoading } = usePendingTransactions()
  const feeTokenPrice = useRecoilValueLoadable(tokenPriceState(fee?.token))
  const multisigDepositTotal = useRecoilValueLoadable(
    multisigDepositTotalSelector({
      chain_id: t.multisig.chain.squidIds.chainData,
      signatories: t?.approvals ? Object.keys(t.approvals).length : 0,
    })
  )

  const isCreating = useMemo(() => !t.draft && !t.rawPending && !t.executedAt, [t.draft, t.executedAt, t.rawPending])

  const handleApprove = useCallback(() => {
    ;(asDraft ? onSaveDraft : onApprove)()
  }, [asDraft, onApprove, onSaveDraft])

  const handleToggleAsDraft = useCallback(() => {
    if (loading) return
    setAsDraft(asDraft => (isCreating ? !asDraft : false))
  }, [isCreating, loading])

  const missingExecutionCallData = useMemo(() => readyToExecute && !t.callData, [readyToExecute, t.callData])

  // Check if the user has an account connected which can approve the transaction
  const connectedAccountCanApprove: boolean = useMemo(() => {
    if (!t) return false
    return Object.entries(t.approvals).some(([encodedAddress, signed]) => {
      if (signed) return false
      return extensionAccounts.some(account => account.address.toPubKey() === encodedAddress)
    })
  }, [t, extensionAccounts])

  const firstApproval = useMemo(() => {
    if (!t) return null
    return !Object.values(t.approvals).find(v => v === true)
  }, [t])

  const canApproveAsChangeConfig = useMemo(() => {
    if (t.decoded?.type !== TransactionType.ChangeConfig || !t.rawPending) return true
    const otherTx = pendingTransactions.filter(tx => tx.decoded?.type !== TransactionType.ChangeConfig)
    return !pendingLoading && otherTx.length === 0 && pendingTransactions.length <= 1
  }, [pendingLoading, pendingTransactions, t.decoded?.type, t.rawPending])

  const warningMessage = useMemo(() => {
    if (missingExecutionCallData) return 'Cannot execute transaction without calldata'
    if (!connectedAccountCanApprove) return 'All connected extension accounts have already signed this transaction'
    if (t.decoded?.type === TransactionType.ChangeConfig && t.rawPending) {
      if (pendingLoading) return <Skeleton.Surface className="h-[16px] w-[60px]" />
      if (!canApproveAsChangeConfig)
        return `You must execute or cancel all pending transactions (${
          pendingTransactions.length - 1
        } remaining) before changing the signer configuration`
    }

    return null
  }, [
    canApproveAsChangeConfig,
    connectedAccountCanApprove,
    missingExecutionCallData,
    pendingLoading,
    pendingTransactions.length,
    t.decoded?.type,
    t.rawPending,
  ])

  const reserveComponent = useMemo(() => {
    if (!connectedAccountCanApprove) return null
    if (multisigDepositTotal.state === 'loading' || !fee) {
      return <Skeleton.Surface className="w-[32px] h-[16px]" />
    } else if (multisigDepositTotal.state === 'hasValue') {
      return (
        <p>{`${balanceToFloat(multisigDepositTotal.contents)} ${fee?.token.symbol} (${formatUsd(
          balanceToFloat(multisigDepositTotal.contents) * feeTokenPrice.contents.current
        )})`}</p>
      )
    } else {
      return <p>Error reserve amount</p>
    }
  }, [multisigDepositTotal, fee, connectedAccountCanApprove, feeTokenPrice])

  const feeComponent = useMemo(() => {
    if (!connectedAccountCanApprove) return null
    if (feeTokenPrice.state === 'loading' || !fee) {
      return <Skeleton.Surface className="w-[32px] h-[16px]" />
    } else if (feeTokenPrice.state === 'hasValue') {
      return (
        <p>{`${balanceToFloat(fee)} ${fee?.token.symbol} (${formatUsd(
          balanceToFloat(fee) * feeTokenPrice.contents.current
        )})`}</p>
      )
    } else {
      return <p>Error loading fee</p>
    }
  }, [feeTokenPrice, fee, connectedAccountCanApprove])

  // get fee and signable extrinsic
  return (
    <div className="w-full grid gap-[12px]">
      {typeof warningMessage === 'string' ? (
        <p>{warningMessage}</p>
      ) : warningMessage !== null ? (
        warningMessage
      ) : (
        <div className="w-full">
          <div className="flex items-center justify-between w-full">
            <p>Estimated Fee</p>
            {feeComponent}
          </div>
          {firstApproval && (
            <div className="flex items-center justify-between w-full">
              <p>Reserve Amount</p>
              {reserveComponent}
            </div>
          )}
          {isCreating && (
            <div className="flex items-center justify-end w-full mt-[12px]">
              <Checkbox checked={asDraft} onCheckedChange={handleToggleAsDraft} disabled={loading} />
              <p
                className={cn(
                  'mt-[3px] ml-[8px] text-offWhite select-none',
                  loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
                )}
                onClick={handleToggleAsDraft}
              >
                Save as Draft
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-[12px] w-full">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => (t.rawPending ? onReject() : onCancel())}
          disabled={t.rawPending ? rejecting || !canReject : false}
          loading={rejecting}
        >
          {t.rawPending ? (canReject ? 'Reject' : 'Only originator can reject') : 'Cancel'}
        </Button>
        <div className="w-full flex items-center flex-col justify-center">
          <Button
            className="w-full"
            onClick={handleApprove}
            disabled={
              missingExecutionCallData ||
              !connectedAccountCanApprove ||
              !canApproveAsChangeConfig ||
              !fee ||
              loading ||
              rejecting
            }
            loading={loading}
          >
            {asDraft ? 'Save as Draft' : readyToExecute ? 'Approve & Execute' : 'Approve'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export const CollaboratorCta: React.FC<{
  t: Transaction
  onDeleteDraft: Function
  onSaveDraft: Function
  onCancel: Function
  loading: boolean
}> = ({ t, loading, onCancel, onDeleteDraft, onSaveDraft }) => {
  const signedInUser = useRecoilValue(selectedAccountState)

  // draft already created and saved to db
  if (t.draft) {
    return (
      <div className="w-full">
        {t.draft.creator.id !== signedInUser?.id && (
          <p>Only the creator of this draft or signers of this vault has permission to delete this draft.</p>
        )}
        <div className="grid grid-cols-2 gap-[12px] w-full">
          <Button variant="outline" className="w-full" onClick={() => onCancel()}>
            Cancel
          </Button>
          <Button
            className="w-full"
            disabled={signedInUser?.id !== t.draft.creator.id || loading}
            onClick={() => onDeleteDraft()}
            variant="destructive"
          >
            Delete Draft
          </Button>
        </div>
      </div>
    )
  }

  if (t.rawPending)
    return (
      <div className="grid grid-cols-2 gap-[12px] w-full">
        <Button className="w-full" onClick={() => onCancel()} variant="outline">
          Cancel
        </Button>
        <Button className="w-full" disabled>
          You're not a signer.
        </Button>
      </div>
    )

  return (
    <div className="grid grid-cols-2 gap-[12px] w-full">
      <Button className="w-full" onClick={() => onCancel()} variant="outline" disabled={loading}>
        Cancel
      </Button>
      <Button className="w-full" disabled={loading} loading={loading} onClick={() => onSaveDraft()}>
        Save as Draft
      </Button>
    </div>
  )
}

export const TransactionSidesheetFooter: React.FC<{
  canReject?: boolean
  fee?: Balance
  readyToExecute: boolean
  t: Transaction
  onCancel: Function
  onApprove: Function
  onDeleteDraft: Function
  onReject: Function
  onSaveDraft: Function
  loading: boolean
  rejecting: boolean
}> = ({
  canReject,
  onApprove,
  onCancel,
  onDeleteDraft,
  onReject,
  onSaveDraft,
  fee,
  loading,
  readyToExecute,
  rejecting,
  t,
}) => {
  const [selectedMultisig] = useSelectedMultisig()
  const signer = useRecoilValue(selectedAccountState)

  const isCollaborator = useMemo(() => {
    if (!signer) return false
    if (!selectedMultisig) return false
    return selectedMultisig.isCollaborator(signer.injected.address)
  }, [selectedMultisig, signer])

  if (isCollaborator)
    return (
      <CollaboratorCta
        loading={loading}
        onDeleteDraft={onDeleteDraft}
        onSaveDraft={onSaveDraft}
        onCancel={onCancel}
        t={t}
      />
    )

  return (
    <SignerCta
      canReject={canReject}
      fee={fee}
      loading={loading}
      rejecting={rejecting}
      onApprove={onApprove}
      onSaveDraft={onSaveDraft}
      onCancel={onCancel}
      onReject={onReject}
      readyToExecute={readyToExecute}
      t={t}
    />
  )
}

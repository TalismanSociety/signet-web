import { useCallback } from 'react'
import { useToast } from '@components/ui/use-toast'
import { useApi } from '@domains/chains/pjs-api'
import { Multisig } from '@domains/multisig'
import { useMultisigExtrinsicFromCalldata } from '@domains/multisig/useMultisigExtrinsicFromCalldata'
import { getErrorString } from '@util/misc'
import TransactionDetailsExpandable from '../Overview/Transactions/TransactionDetailsExpandable'
import TransactionSummarySideSheet from '../Overview/Transactions/TransactionSummarySideSheet'

type Props = {
  calldata: `0x${string}`
  description: string
  selectedMultisig: Multisig
  onApproved: () => void
  onCancel: () => void
  open: boolean
}

/**
 * Takes a call data hex (e.g. extrinsic.method.toHex()) and wrap it in a proxy call
 * Also handles submitting the approval transaction
 * TODO: make this generic
 **/
export const SignSummary: React.FC<Props> = ({
  selectedMultisig,
  calldata,
  description,
  onApproved,
  onCancel,
  open,
}) => {
  const { api } = useApi(selectedMultisig.chain.rpcs)
  const { approve, approving, estimatedFee, proxyExtrinsic, ready, t } = useMultisigExtrinsicFromCalldata(
    description,
    selectedMultisig,
    calldata,
    api
  )
  const { toast } = useToast()

  const handleApprove = useCallback(async () => {
    try {
      await approve()
      onApproved()
      toast({
        title: 'Transaction successful!',
        description: `Transaction "${description}" was made`,
      })
    } catch (e) {
      if (e === 'Cancelled') return

      console.error(e)
      onCancel() // close the sidesheet so user can see the error toast
      toast({
        title: 'Transaction failed',
        description: getErrorString(e, 120, 'Check browser console for details of error.'),
        duration: 300_000, // stay open for 5 minutes
        variant: 'destructive',
      })
    }
  }, [approve, description, onApproved, onCancel, toast])

  return (
    <TransactionSummarySideSheet
      canCancel={!approving}
      cancelButtonTextOverride="Back"
      fee={ready ? estimatedFee : undefined}
      onApprove={handleApprove}
      onCancel={async () => onCancel()}
      onClose={onCancel}
      open={proxyExtrinsic?.extrinsic !== undefined && open}
      t={t}
      transactionDetails={t ? <TransactionDetailsExpandable t={t} /> : null}
    />
  )
}

import { SubmittableExtrinsic } from '@polkadot/api/types'
import {
  Transaction,
  TransactionApprovals,
  extrinsicToDecoded,
  useNextTransactionSigner,
  useSelectedMultisig,
} from '../../domains/multisig'
import { useApi } from '../../domains/chains/pjs-api'
import { useEffect, useMemo, useState } from 'react'
import { allChainTokensSelector, useApproveAsMulti } from '../../domains/chains'
import { useRecoilValueLoadable } from 'recoil'
import TransactionSummarySideSheet from '../Overview/Transactions/TransactionSummarySideSheet'
import TransactionDetailsExpandable from '../Overview/Transactions/TransactionDetailsExpandable'

export const CallSummary: React.FC<{
  innerExtrinsic?: SubmittableExtrinsic<'promise'>
  onComplete: () => void
  dappUrl: string
}> = ({ dappUrl, innerExtrinsic, onComplete }) => {
  const [extrinsic, setExtrinsic] = useState<SubmittableExtrinsic<'promise'>>()

  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig.chain.rpcs)
  const allActiveChainTokens = useRecoilValueLoadable(allChainTokensSelector)

  useEffect(() => {
    if (!innerExtrinsic) {
      setExtrinsic(undefined)
    } else {
      if (!api) return
      if (!api.tx.proxy?.proxy) {
        // TODO: handle error
        return
      }
      const proxyExtrinsic = api.tx.proxy.proxy(selectedMultisig.proxyAddress.bytes, null, innerExtrinsic)
      setExtrinsic(proxyExtrinsic)
    }
  }, [api, innerExtrinsic, selectedMultisig.proxyAddress.bytes])

  const hash = innerExtrinsic?.registry.hash(innerExtrinsic.method.toU8a()).toHex()

  const t: Transaction | undefined = useMemo(() => {
    const curChainTokens = allActiveChainTokens.contents.get(selectedMultisig.chain.squidIds.chainData)

    if (extrinsic) {
      const decoded = extrinsicToDecoded(selectedMultisig, extrinsic, curChainTokens)
      if (decoded === 'not_ours') return undefined
      return {
        date: new Date(),
        hash: hash || '0x',
        description: `Transaction from ${dappUrl}`,
        multisig: selectedMultisig,
        approvals: selectedMultisig.signers.reduce((acc, key) => {
          acc[key.toPubKey()] = false
          return acc
        }, {} as TransactionApprovals),
        decoded: decoded.decoded,
        callData: extrinsic.method.toHex(),
      }
    }
  }, [allActiveChainTokens.contents, selectedMultisig, extrinsic, hash, dappUrl])

  const signer = useNextTransactionSigner(t?.approvals)
  const { estimatedFee, ready } = useApproveAsMulti(signer?.address, hash, null, t?.multisig)

  return (
    <TransactionSummarySideSheet
      open={extrinsic !== undefined}
      onClose={() => {
        onComplete()
        setExtrinsic(undefined)
      }}
      t={t}
      canCancel
      fee={ready ? estimatedFee : undefined}
      cancelButtonTextOverride="Back"
      transactionDetails={t ? <TransactionDetailsExpandable t={t} /> : null}
      onApprove={() =>
        new Promise((resolve, reject) => {
          if (!extrinsic) {
            // toast.error("Couldn't get hash or extrinsic")
            return
          }
          onComplete()
          setExtrinsic(undefined)
          //   approveAsMulti({
          //     metadata: {
          //       description: transactionName,
          //       callData: extrinsic.method.toHex(),
          //     },
          //     onSuccess: () => {
          //       navigate('/overview')
          //       toast.success('Transaction successful!', { duration: 5000, position: 'bottom-right' })
          //       resolve()
          //     },
          //     onFailure: e => {
          //       navigate('/overview')
          //       toast.error('Transaction failed')
          //       console.error(e)
          //       reject()
          //     },
          //   })
        })
      }
      onCancel={() => {
        // setReviewing(false)
        onComplete()
        setExtrinsic(undefined)
        return Promise.resolve()
      }}
    />
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useRecoilValueLoadable } from 'recoil'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import {
  Transaction,
  TransactionApprovals,
  extrinsicToDecoded,
  useNextTransactionSigner,
  useSelectedMultisig,
} from '@domains/multisig'
import { useApi } from '@domains/chains/pjs-api'
import { allChainTokensSelector, useApproveAsMulti } from '@domains/chains'
import { useToast } from '@components/ui/use-toast'
import TransactionSummarySideSheet from '../Overview/Transactions/TransactionSummarySideSheet'
import TransactionDetailsExpandable from '../Overview/Transactions/TransactionDetailsExpandable'

export const CallSummary: React.FC<{
  innerExtrinsic?: SubmittableExtrinsic<'promise'>
  onComplete: (res: {
    ok: boolean
    error?: string
    receipt?: { blockNumber?: number; txIndex?: number; txHash: string }
  }) => void
  dappUrl: string
}> = ({ dappUrl, innerExtrinsic, onComplete }) => {
  const [extrinsic, setExtrinsic] = useState<SubmittableExtrinsic<'promise'>>()
  const [approving, setApproving] = useState(false)

  const { toast } = useToast()
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig.chain.rpcs)
  const allActiveChainTokens = useRecoilValueLoadable(allChainTokensSelector)

  useEffect(() => {
    if (!innerExtrinsic) {
      setExtrinsic(undefined)
    } else {
      if (!api) return
      if (!api.tx.proxy?.proxy) {
        toast({
          title: 'Proxy module not available',
          description: 'Proxy module is not available on this chain',
          type: 'background',
        })
        return
      }
      const proxyExtrinsic = api.tx.proxy.proxy(selectedMultisig.proxyAddress.bytes, null, innerExtrinsic)
      setExtrinsic(proxyExtrinsic)
    }
  }, [api, innerExtrinsic, selectedMultisig.proxyAddress.bytes, toast])

  const hash = extrinsic?.registry.hash(extrinsic.method.toU8a()).toHex()

  const t: Transaction | undefined = useMemo(() => {
    if (allActiveChainTokens.state !== 'hasValue') return undefined
    const curChainTokens = allActiveChainTokens.contents.get(selectedMultisig.chain.squidIds.chainData)

    if (!extrinsic || !curChainTokens) return undefined
    const decoded = extrinsicToDecoded(selectedMultisig, extrinsic, curChainTokens)

    // only for type safety, this should not happen because proxy address is crafted on the spot
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
  }, [allActiveChainTokens.state, allActiveChainTokens.contents, selectedMultisig, extrinsic, hash, dappUrl])

  const signer = useNextTransactionSigner(t?.approvals)
  const { approveAsMulti, estimatedFee, ready } = useApproveAsMulti(signer?.address, hash, null, t?.multisig)

  return (
    <TransactionSummarySideSheet
      open={extrinsic !== undefined}
      onClose={() => {
        onComplete({ ok: false, error: 'Cancelled' })
        setExtrinsic(undefined)
      }}
      t={t}
      canCancel={!approving}
      fee={ready ? estimatedFee : undefined}
      cancelButtonTextOverride="Back"
      transactionDetails={t ? <TransactionDetailsExpandable t={t} /> : null}
      onApprove={() =>
        new Promise(resolve => {
          // this should not happen because if !extrinsic the summary would not be open
          if (!extrinsic || !t) return

          setApproving(true)
          approveAsMulti({
            metadata: {
              description: t?.description,
              callData: extrinsic.method.toHex(),
            },
            onSuccess: r => {
              toast({
                title: 'Transaction successful!',
                description: `Transaction made from ${dappUrl}`,
              })
              setExtrinsic(undefined)
              setApproving(false)
              onComplete({
                ok: true,
                receipt: {
                  txHash: r.txHash.toHex(),
                  blockNumber: r.blockNumber?.toNumber(),
                  txIndex: r.txIndex,
                },
              })
              resolve()
            },
            onFailure: e => {
              toast({
                title: 'Transaction failed',
                description: e ?? `Transaction from ${dappUrl} failed`,
              })
              setApproving(false)
              setExtrinsic(undefined)
              onComplete({ ok: false, error: e })
              resolve()
            },
          })
        })
      }
      onCancel={async () => {
        onComplete({ ok: false, error: 'Cancelled' })
        setExtrinsic(undefined)
      }}
    />
  )
}

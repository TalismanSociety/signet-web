import { Layout } from '../Layout'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@components/ui/button'
import { MessageService } from '@domains/connect/MessageService'
import clsx from 'clsx'
import { atom, useRecoilValue } from 'recoil'
import { useSelectedMultisig } from '@domains/multisig'
import { decodeCallData } from '@domains/chains'
import { useApi } from '@domains/chains/pjs-api'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { TransactionSidesheet } from '@components/TransactionSidesheet'
import { useToast } from '@components/ui/use-toast'
import { Input } from '@components/ui/input'
import { CircularProgressIndicator } from '@talismn/ui'

const isValidUrl = (url: string) => {
  try {
    return new URL(url)
  } catch (e) {
    return false
  }
}

const messageServiceState = atom({
  key: 'iframeMessageService',
  default: new MessageService(message => message.isTrusted && message.type === 'message', { debug: false }),
  dangerouslyAllowMutability: true,
})

export const Dapps: React.FC = () => {
  const [input, setInput] = useState('')
  const [shouldLoadUrl, setShouldLoadUrl] = useState(false)
  const [isSdkSupported, setIsSdkSupported] = useState<boolean | undefined>()
  const [txRequest, setTxRequest] = useState<{ innerExtrinsic: SubmittableExtrinsic<'promise'>; res: Function }>()

  const messageService = useRecoilValue(messageServiceState)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const timeoutIdRef = useRef<number>()

  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig.chain.rpcs)
  const { toast } = useToast()

  const url = isValidUrl(input)

  const handleVisitDapp = (e: React.FormEvent) => {
    e.preventDefault()
    if (url) setShouldLoadUrl(true)
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    setShouldLoadUrl(false)
    setIsSdkSupported(undefined)
    window.clearTimeout(timeoutIdRef.current)
    setInput(e.target.value)
  }

  const handleIframeLoaded = async () => {
    // make sure we clear all previously set timeouts
    window.clearTimeout(timeoutIdRef.current)
    // if we didn't get a sdk init message within 3 seconds, we assume it's not supported
    timeoutIdRef.current = window.setTimeout(() => {
      setIsSdkSupported(false)
    }, 5000)
  }

  const loading = useMemo(() => shouldLoadUrl && isSdkSupported === undefined, [isSdkSupported, shouldLoadUrl])

  const handleNewExtrinsic = useCallback(
    (calldata: string) => {
      try {
        if (!api) return { error: 'api not loaded', ok: false }
        const extrinsic = decodeCallData(api, calldata as `0x{string}`)
        if (!extrinsic) return { error: 'Could not decode calldata!', ok: false }

        return { ok: true, extrinsic }
      } catch (error) {
        if (error instanceof Error) return { error: `Invalid calldata: ${error.message}`, ok: false }
        else return { error: `Invalid calldata: unknown error`, ok: false }
      }
    },
    [api]
  )

  // this hook handles passing data from Signet to the iframe
  useEffect(() => {
    messageService.onData((message, res) => {
      if (!url) return
      if (message.origin.toLowerCase() !== url.origin.toLowerCase())
        return console.log('message origin does not match iframe url')
      const { type } = message.data
      if (type === 'iframe(init)') {
        setIsSdkSupported(true)
        window.clearTimeout(timeoutIdRef.current)
        res(true)
      }

      if (type === 'iframe(getAccount)') {
        res({
          chain: {
            genesisHash: selectedMultisig.chain.genesisHash,
            id: selectedMultisig.chain.squidIds.chainData,
            name: selectedMultisig.chain.chainName,
          },
          name: selectedMultisig.name,
          vaultAddress: selectedMultisig.proxyAddress.toSs58(selectedMultisig.chain),
        })
      }

      if (type === 'iframe(send)') {
        const [calldata] = message.data.payload
        if (!calldata) return res({ ok: false, error: 'Missing calldata!' })
        const { extrinsic, ok, error } = handleNewExtrinsic(calldata)
        if (extrinsic) setTxRequest({ innerExtrinsic: extrinsic, res })
        else res({ ok, error })
      }
    })
  }, [
    handleNewExtrinsic,
    messageService,
    selectedMultisig.chain,
    selectedMultisig.id,
    selectedMultisig.name,
    selectedMultisig.proxyAddress,
    url,
  ])

  useEffect(() => {
    if (shouldLoadUrl && iframeRef.current) {
      // eslint-disable-next-line no-self-assign
      iframeRef.current.src = iframeRef.current?.src
      setIsSdkSupported(undefined)
    }
  }, [selectedMultisig.id, shouldLoadUrl])
  return (
    <Layout selected="Dapps" requiresMultisig>
      <div css={{ display: 'flex', flex: 1, padding: '32px 2%', flexDirection: 'column', gap: 32, width: '100%' }}>
        <h2 css={({ color }) => ({ color: color.offWhite, marginTop: 4 })}>Dapps</h2>
        <form className="flex items-center w-full gap-[12px]" onSubmit={handleVisitDapp}>
          <div className="w-full [&>div]:w-full">
            <Input className="w-full" value={input} onChange={handleUrlChange} />
          </div>
          <Button disabled={!url || loading || shouldLoadUrl} className="h-[51px]" loading={loading}>
            Visit Dapp
          </Button>
        </form>
        {shouldLoadUrl && (
          <div className={clsx('bg-gray-800 rounded-[12px] overflow-hidden border border-gray-600')}>
            <iframe
              ref={iframeRef}
              src={input.toLowerCase()}
              title="Signet Dapps"
              className={clsx(isSdkSupported ? 'w-full h-full min-h-screen visible' : 'w-0 h-0 invisible')}
              onLoad={handleIframeLoaded}
            />
            {!isSdkSupported && (
              <div className="w-full bg-gray-800 p-[16px] rounded-[12px]">
                {isSdkSupported === undefined ? (
                  <div className="w-full flex items-center justify-center gap-[12px]">
                    <CircularProgressIndicator />
                    <p className="mt-[3px]">Loading dapp...</p>
                  </div>
                ) : !isSdkSupported ? (
                  <p>The dapp may not support being used in Signet.</p>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
      {txRequest && (
        <TransactionSidesheet
          description={`Transaction from ${url}`}
          open
          onClose={() => {
            txRequest.res({
              ok: false,
              error: 'Cancelled',
            })
            setTxRequest(undefined)
          }}
          calldata={txRequest.innerExtrinsic.method.toHex()}
          onApproveFailed={e => {
            toast({
              title: 'Failed to approve transaction',
              description: e.message,
            })
          }}
          onApproved={({ result }) => {
            toast({ title: 'Transaction successful' })
            txRequest?.res({
              ok: true,
              receipt: {
                txHash: result.txHash.toHex(),
                blockNumber: result.blockNumber?.toNumber(),
                txIndex: result.txIndex,
              },
            })
            setTxRequest(undefined)
          }}
        />
      )}
    </Layout>
  )
}

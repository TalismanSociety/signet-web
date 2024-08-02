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
import { X } from '@talismn/icons'
import { Tooltip } from '@components/ui/tooltip'
import { ChevronsLeftRight, ChevronsRightLeft } from 'lucide-react'
import { ToastAction } from '@components/ui/toast'
import { useNavigate } from 'react-router-dom'
import { SUPPORTED_DAPPS, SupportedDapp } from './supported-dapps'
import { PageTabs, PageTabsContent, PageTabsList, PageTabsTrigger } from '@components/ui/page-tabs'
import { CONFIG } from '@lib/config'
import { Link } from 'react-router-dom'
import { SupportedChainIds } from '@domains/chains/generated-chains'

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
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [shouldLoadUrl, setShouldLoadUrl] = useState(false)
  const [isSdkSupported, setIsSdkSupported] = useState<boolean | undefined>()
  const [txRequest, setTxRequest] = useState<{ innerExtrinsic: SubmittableExtrinsic<'promise'>; res: Function }>()

  const messageService = useRecoilValue(messageServiceState)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig.chain.genesisHash)
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)

  const url = isValidUrl(input)

  const handleVisitDapp = (e: React.FormEvent) => {
    e.preventDefault()
    if (url) setShouldLoadUrl(true)
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    setShouldLoadUrl(false)
    setIsSdkSupported(undefined)
    setInput(e.target.value)
  }

  const closeIframe = () => {
    setShouldLoadUrl(false)
    setIsSdkSupported(undefined)
    setInput('')
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
        res(true)
      }

      if (type === 'iframe(getAccount)') {
        res({
          chain: {
            genesisHash: selectedMultisig.chain.genesisHash,
            id: selectedMultisig.chain.id,
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

  const getDappUrl = useCallback(
    (dapp: SupportedDapp) => {
      if (typeof dapp.url === 'string') return dapp.url
      return dapp.url[selectedMultisig.chain.id as SupportedChainIds]
    },
    [selectedMultisig.chain.id]
  )

  const supportedDapps = useMemo(() => {
    return SUPPORTED_DAPPS.map(dapp => ({ ...dapp, url: getDappUrl(dapp) })).filter(dapp => dapp.url) as (Omit<
      SupportedDapp,
      'url'
    > & { url: string })[]
  }, [getDappUrl])

  const selectedDapp = useMemo(() => {
    return supportedDapps.find(({ url }) => url === input)
  }, [input, supportedDapps])

  useEffect(() => {
    if (!selectedDapp) {
      // may have changed network, find the dapp that has the previous selected url
      const dapp = SUPPORTED_DAPPS.find(dapp => {
        if (typeof dapp.url === 'string') return dapp.url === input
        return Object.values(dapp.url).includes(input)
      })

      // changed network, check if the dapp is supported on the new network
      if (dapp) {
        const urlOnCurrentChain = getDappUrl(dapp)
        if (urlOnCurrentChain) return setInput(urlOnCurrentChain)
      }
      closeIframe()
    }
  }, [getDappUrl, input, selectedDapp])

  return (
    <>
      <div css={{ display: 'flex', flex: 1, padding: 16, flexDirection: 'column', gap: 16, width: '100px' }}>
        {selectedDapp && shouldLoadUrl && (
          <div className="flex items-center gap-[8px]">
            <img src={selectedDapp.logo} alt={selectedDapp.name} className="w-[32px] h-[32px] rounded-[8px]" />
            <h2 className="font-bold text-offWhite mt-[4px]">{selectedDapp.name}</h2>
          </div>
        )}

        {shouldLoadUrl && url ? (
          <div
            className={clsx(
              expanded
                ? 'absolute left-0 right-0 lg:left-[16px] lg:right-[16px] lg:bottom-[16px] rounded-b-0 rounded-t-[12px] lg:rounded-b-[12px] top-[96px] bottom-0'
                : 'w-full overflow-hidden rounded-[12px]',
              'bg-gray-800 border border-gray-600 transition-all duration-300 flex flex-col flex-1'
            )}
          >
            <div className="flex items-center justify-between px-[12px] py-[8px] gap-[8px]">
              <div className="flex flex-1 items-center w-1 gap-[8px]">
                {isSdkSupported ? (
                  <Tooltip
                    content={
                      <p className="text-gray-200 text-[12px]">
                        <span className="font-bold text-offWhite">{selectedMultisig.name}</span> is connected to{' '}
                        {url.origin}
                      </p>
                    }
                  >
                    <div className="bg-green-400/30 w-[12px] h-[12px] rounded-full flex items-center justify-center">
                      <div className="bg-green-600 w-[8px] h-[8px] rounded-full" />
                    </div>
                  </Tooltip>
                ) : (
                  <Tooltip
                    content={
                      <p className="text-[12px]">
                        Waiting for dapp to establish communication and connect to your multisig.
                        <br />
                        The dapp may not support connecting to {CONFIG.APP_NAME} multisigs.
                      </p>
                    }
                  >
                    <div className="min-w-[12px]">
                      <CircularProgressIndicator size={12} />
                    </div>
                  </Tooltip>
                )}
                <p className="text-[14px] w-full max-w-max text-offWhite overflow-hidden text-ellipsis mt-[3px]">
                  {url.origin}
                  <span className="text-gray-200">{url.pathname}</span>
                </p>
              </div>
              <div className="flex items-center justify-end gap-[12px]">
                <div
                  className="bg-green-500 hover:bg-green-400 rounded-full p-[2px]"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <ChevronsRightLeft size={10} className="text-green-950 -rotate-45" />
                  ) : (
                    <ChevronsLeftRight size={10} className="text-green-950 -rotate-45" />
                  )}
                </div>
                <div className="bg-red-500 hover:bg-red-400 rounded-full p-[1px]" onClick={closeIframe}>
                  <X size={12} className="text-red-950" />
                </div>
              </div>
            </div>
            <iframe
              ref={iframeRef}
              src={input.toLowerCase()}
              title={`${CONFIG.APP_NAME} Dapps`}
              className="w-full h-full flex flex-1"
            />
          </div>
        ) : (
          <PageTabs defaultValue="apps">
            <PageTabsList>
              <PageTabsTrigger value="apps">Dapps</PageTabsTrigger>
              <PageTabsTrigger value="custom-input">Custom Input</PageTabsTrigger>
            </PageTabsList>
            <PageTabsContent value="apps">
              <div className="flex flex-wrap gap-[12px]">
                {supportedDapps.map(dapp => (
                  <Button
                    className="aspect-square w-full min-w-[160px] max-w-[200px] !h-auto p-[16px] flex flex-1"
                    variant="secondary"
                    onClick={() => {
                      setIsSdkSupported(undefined)
                      setInput(dapp.url)
                      setShouldLoadUrl(true)
                    }}
                  >
                    <div className="flex flex-1 flex-col gap-[8px] h-full">
                      <div className="flex flex-1 h-1 p-[12px] rounded-[8px]" style={{ background: dapp.background }}>
                        <img src={dapp.logo} alt={dapp.name} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <p className="text-offWhite font-bold">{dapp.name}</p>
                        <p className="text-gray-200 text-[12px]">{dapp.url}</p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </PageTabsContent>
            <PageTabsContent value="custom-input">
              <div className="w-full">
                <form className="flex flex-col sm:flex-row items-center w-full gap-[12px]" onSubmit={handleVisitDapp}>
                  <div className="w-full [&>div]:w-full">
                    <Input className="w-full" value={input} onChange={handleUrlChange} />
                  </div>
                  <Button disabled={!url || loading || shouldLoadUrl} className="h-[51px] w-full sm:w-auto">
                    Visit Dapp
                  </Button>
                </form>
                <div className="w-full p-[16px] mt-[12px] bg-gray-700 rounded-[20px] border-gray-400 border">
                  <p>
                    Note that dapps have to integrate with the{' '}
                    <Link
                      to="https://github.com/TalismanSociety/signet-apps-sdk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Signet SDK
                    </Link>{' '}
                    to offer seamless multisig experience. If you are a developer integrating the SDK, please reach out
                    to{' '}
                    <Link
                      to={`mailto:${CONFIG.CONTACT_EMAIL}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {CONFIG.CONTACT_EMAIL}
                    </Link>{' '}
                    to get your dapp listed.
                  </p>
                </div>
              </div>
            </PageTabsContent>
          </PageTabs>
        )}
      </div>
      {txRequest && (
        <TransactionSidesheet
          description={`Transaction from ${url}`}
          open
          preventRedirect // users may want to continue browsing on the page
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
          onSaved={() => {
            toast({
              title: 'Saved as draft!',
              action: (
                <ToastAction altText="View Drafts" onClick={() => navigate('/overview?tab=draft')}>
                  View
                </ToastAction>
              ),
            })
            txRequest?.res({
              ok: true,
              error: 'Saved as draft, please ignore this error.',
            })
            setTxRequest(undefined)
          }}
        />
      )}
    </>
  )
}

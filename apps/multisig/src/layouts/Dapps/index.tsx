import { TextInput } from '@talismn/ui'
import { Layout } from '../Layout'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@components/ui/button'
import { MessageService } from '../../domains/connect/MessageService'
import clsx from 'clsx'
import { atom, useRecoilValue } from 'recoil'
import { useSelectedMultisig } from '../../domains/multisig'

const isValidUrl = (url: string) => {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

const messageServiceState = atom({
  key: 'iframeMessageService',
  default: new MessageService(message => {
    // TODO: filter only iframe messages
    return true
  }),
  dangerouslyAllowMutability: true,
})

export const Dapps: React.FC = () => {
  const [url, setUrl] = useState('')
  const [shouldLoadUrl, setShouldLoadUrl] = useState(false)
  const [isSdkSupported, setIsSdkSupported] = useState<boolean | undefined>()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const messageService = useRecoilValue(messageServiceState)
  const [sdkSupportTimeout, setSdkSupportTimeout] = useState<NodeJS.Timeout>()

  const [selectedMultisig] = useSelectedMultisig()

  const isUrlValid = isValidUrl(url)

  const handleVisitDapp = (e: React.FormEvent) => {
    e.preventDefault()
    if (isUrlValid) setShouldLoadUrl(true)
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    setShouldLoadUrl(false)
    setIsSdkSupported(undefined)
    setUrl(e.target.value)
  }

  const handleIframeLoaded = async () => {
    // send message to dapp to check if they support our sdk
    try {
      const targetWindow = iframeRef.current?.contentWindow
      if (!targetWindow) return setIsSdkSupported(false) // most likely caused by broken url

      // if we didn't get a sdk init message within 3 seconds, we assume it's not supported
      const timeoutId = setTimeout(() => {
        setIsSdkSupported(false)
      }, 3000)

      setSdkSupportTimeout(timeoutId)
    } catch (e) {
      setIsSdkSupported(false)
    }
  }

  const loading = useMemo(() => shouldLoadUrl && isSdkSupported === undefined, [isSdkSupported, shouldLoadUrl])

  // this hook handles passing data from Signet to the iframe
  useEffect(() => {
    messageService.onData((message, res) => {
      if (message.origin !== url) return console.log('message origin does not match iframe url')
      const { type } = message.data
      if (type === 'iframe(init)') {
        setIsSdkSupported(true)
        if (sdkSupportTimeout !== undefined) {
          setSdkSupportTimeout(undefined)
          clearTimeout(sdkSupportTimeout)
          res(true)
        }
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
    })
  }, [
    messageService,
    sdkSupportTimeout,
    selectedMultisig.chain,
    selectedMultisig.name,
    selectedMultisig.proxyAddress,
    url,
  ])

  return (
    <Layout selected="Dapps" requiresMultisig>
      <div css={{ display: 'flex', flex: 1, padding: '32px 2%', flexDirection: 'column', gap: 32, width: '100%' }}>
        <h2 css={({ color }) => ({ color: color.offWhite, marginTop: 4 })}>Dapps</h2>
        <form className="flex items-center w-full gap-[12px]" onSubmit={handleVisitDapp}>
          <div className="w-full [&>div]:w-full">
            <TextInput className="w-full" value={url} onChange={handleUrlChange} />
          </div>
          <Button disabled={!isUrlValid} className="h-[51px]" loading={loading} onClick={() => setShouldLoadUrl(true)}>
            Visit Dapp
          </Button>
        </form>
        {shouldLoadUrl && (
          <div className={clsx('bg-gray-800 rounded-[12px] overflow-hidden border border-gray-600')}>
            <iframe
              ref={iframeRef}
              src={url}
              title="Signet Dapps"
              className={clsx(isSdkSupported ? 'w-full h-full min-h-screen visible' : 'w-0 h-0 invisible')}
              onLoad={handleIframeLoaded}
            />
            {!isSdkSupported && (
              <div className="w-full bg-gray-800 p-[16px] rounded-[12px]">
                {isSdkSupported === undefined ? (
                  <p>Loading dapp...</p>
                ) : !isSdkSupported ? (
                  <p>The dapp does not support being used in Signet.</p>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

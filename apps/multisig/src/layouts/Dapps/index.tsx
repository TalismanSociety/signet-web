import { TextInput } from '@talismn/ui'
import { Layout } from '../Layout'
import { useMemo, useRef, useState } from 'react'
import { Button } from '@components/ui/button'
import { MessageService } from '../../domains/connect/MessageService'
import clsx from 'clsx'
import { atom, useRecoilValue } from 'recoil'

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
    console.log(message)
    return true
  }),
})

export const Dapps: React.FC = () => {
  const [url, setUrl] = useState('')
  const [shouldLoadUrl, setShouldLoadUrl] = useState(false)
  const [isSdkSupported, setIsSdkSupported] = useState<boolean | undefined>()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const messageService = useRecoilValue(messageServiceState)

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

      const res = await messageService.send('pub(iframe.hasSignetSdk)', [], url, targetWindow)
      console.log(res) // we're expecting true here
    } catch (e) {
      setIsSdkSupported(false)
    }
  }

  const loading = useMemo(() => shouldLoadUrl && isSdkSupported === undefined, [isSdkSupported, shouldLoadUrl])

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
              className={clsx(isSdkSupported ? 'w-full h-full visible' : 'w-0 h-0 invisible')}
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

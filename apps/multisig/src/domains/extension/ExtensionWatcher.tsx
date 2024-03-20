import { useCallback, useEffect, useState } from 'react'
import { useRecoilState } from 'recoil'
import { accountsState, extensionAllowedState, extensionInitiatedState, extensionLoadingState } from './index'
import { web3AccountsSubscribe, web3Enable } from '@polkadot/extension-dapp'
import { uniqBy } from 'lodash'
import { Address } from '@util/addresses'
import { useToast } from '@components/ui/use-toast'
import { ToastAction } from '@components/ui/toast'
import { CONFIG } from '@lib/config'

export const ExtensionWatcher = () => {
  // extensionAllowed is used to trigger web3Enable call
  // e.g. set extensionAllowed to true when user clicks "connect wallet" button
  // if web3Enable call is successful, and we detect extension accounts, then we set extensionsDetected to true
  // which will trigger the web3AccountsSubscribe call
  const [extensionsDetected, setExtensionsDetected] = useState(false)
  const [extensionAllowed, setExtensionAllowed] = useRecoilState(extensionAllowedState)
  const [extensionLoading, setExtensionLoading] = useRecoilState(extensionLoadingState)
  const [detectedExtensions, setDetectedExtensions] = useState<string[]>([])
  const [extensionInitiated, setExtensionInitiated] = useRecoilState(extensionInitiatedState)
  const [subscribed, setSubscribed] = useState(false)
  const [accounts, setAccounts] = useRecoilState(accountsState)
  const { toast } = useToast()

  const connectWallet = useCallback(async () => {
    try {
      setExtensionLoading(true)
      // fire Connect Wallet popup and detect accounts allowed in extensions
      const extensions = await web3Enable(CONFIG.APP_NAME)

      // only add to detected list if more than 1 account is available
      const detected: string[] = []
      for (const ext of extensions) {
        const accounts = await ext.accounts.get(true)
        if (accounts.length > 0) detected.push(ext.name)
      }

      // if none detected, warn user and keep "Connect Wallet" button clickable by setting extensionAllowed to false
      if (detected.length === 0) {
        toast({
          title: 'Failed to connect wallet',
          description: 'No wallet extension detected.',
          action: (
            <ToastAction
              altText="Go to talisman.xyz"
              onClick={() => {
                window.open('https://talisman.xyz', '_blank')
              }}
            >
              Try Talisman
            </ToastAction>
          ),
        })
        setExtensionAllowed(false)
      }

      // trigger web3AccountSubscribe only if some accounts are detected
      // otherwise we'll have a subscription error bug
      setExtensionsDetected(detected.length > 0)
      setDetectedExtensions(detected)
    } catch (e) {
      console.error(e)
      setExtensionsDetected(false)
      setDetectedExtensions([])
    } finally {
      setExtensionLoading(false)
    }
  }, [setExtensionAllowed, setExtensionLoading, toast])

  useEffect(() => {
    if (extensionAllowed && !extensionLoading && !extensionsDetected) connectWallet()
  }, [connectWallet, extensionAllowed, extensionLoading, extensionsDetected])

  // subscribe to extension accounts - we only subscribe once per session, don't need to unsubscribe / re-subscribe
  useEffect(() => {
    if (!extensionsDetected || subscribed) return

    setSubscribed(true)
    web3AccountsSubscribe(accounts => {
      const uniqueAccounts = uniqBy(accounts, account => account.address)
        .map(account => {
          const address = Address.fromSs58(account.address)
          // we force `as Address` so it can be used with setAccounts without having to define the type
          return { ...account, address: address as Address }
        })
        // address may actually be false if invalid (e.g. evm address)
        .filter(({ address }) => !!address)

      setAccounts(uniqueAccounts)
    }).catch(e => {
      console.error(e)
      setSubscribed(false)
    })
  }, [extensionsDetected, setAccounts, subscribed])

  useEffect(() => {
    if (detectedExtensions.length === 0) return
    if (!extensionInitiated) {
      // set initiated to true if accounts list has accounts of every detected extension
      const connectedExtensions = uniqBy(accounts, account => account.meta.source).map(account => account.meta.source)
      if (detectedExtensions.every(extension => connectedExtensions.includes(extension))) setExtensionInitiated(true)
    } else {
      // detect wallet disconnection, which will trigger a clean up on authTokenBook
      setExtensionAllowed(accounts.length > 0)
      setExtensionsDetected(accounts.length > 0)
    }
  }, [accounts, detectedExtensions, extensionInitiated, setExtensionAllowed, setExtensionInitiated])
  return null
}

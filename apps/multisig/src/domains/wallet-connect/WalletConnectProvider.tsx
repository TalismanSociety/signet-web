import { Core } from '@walletconnect/core'
import type { IWeb3Wallet } from '@walletconnect/web3wallet/dist/types'
import { Web3Wallet } from '@walletconnect/web3wallet'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { atom, useRecoilState, useSetRecoilState } from 'recoil'
import { Address } from '@util/addresses'
import { useMemo } from 'react'
import { SessionTypes } from '@walletconnect/types'

const sessionsState = atom<SessionTypes.Struct[]>({
  key: 'walletConnectSessions',
  default: [],
  dangerouslyAllowMutability: true,
})

const WalletConnectContext = createContext<IWeb3Wallet | undefined>(undefined)

export const WalletConnectProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [web3Wallet, setWeb3Wallet] = useState<IWeb3Wallet>()
  const setSessions = useSetRecoilState(sessionsState)

  useEffect(() => {
    Web3Wallet.init({
      core: new Core({ projectId: '61ba770066576b6561f6c8cfc306b9a2' }),
      metadata: {
        name: 'Signet',
        description: 'Create multisig transactions with Signet.',
        icons: ['https://signet.talisman.xyz/logo512.png'],
        url: 'https://talisman.xyz/signet',
      },
    }).then(_web3Wallet => {
      setWeb3Wallet(_web3Wallet)
      setSessions(Object.values(_web3Wallet.getActiveSessions()))
    })
  }, [setSessions, setWeb3Wallet])

  return <WalletConnectContext.Provider value={web3Wallet}>{children}</WalletConnectContext.Provider>
}

export const useWalletConnectSessions = (filterAddress?: Address) => {
  const web3Wallet = useContext(WalletConnectContext)
  const [sessions, setSessions] = useRecoilState(sessionsState)

  const refresh = useCallback(() => {
    setSessions(Object.values(web3Wallet?.getActiveSessions() ?? {}))
  }, [setSessions, web3Wallet])

  return {
    sessions: useMemo(
      () =>
        sessions.filter(({ namespaces }) => {
          if (!filterAddress) return true
          if (!namespaces.polkadot) return false
          return !!namespaces.polkadot.accounts.find(namespace => {
            const addressString = namespace.split(':')[2]
            if (!addressString) return false
            try {
              const address = Address.fromSs58(addressString)
              if (!address) return false
              return address.isEqual(filterAddress)
            } catch (e) {
              return false
            }
          })
        }),
      [filterAddress, sessions]
    ),
    refresh,
    web3Wallet,
  }
}

import { Contract, Eye, Globe, List, Send, Settings, Share2, UserPlus, Users, Vote, Zap } from '@talismn/icons'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { EyeOfSauronProgressIndicator } from '@talismn/ui'
import { useRecoilValue } from 'recoil'
import { activeTeamsState } from '../domains/offchain-data'
import { Navigate, useLocation } from 'react-router-dom'
import BetaNotice from './Overview/BetaNotice'
import { useDevMode } from '../domains/common/useDevMode'
import WalletConnectLogo from '@components/WalletConnectLogo'
import { WalletConnectRequest } from '@domains/wallet-connect/WalletConnectRequest'
import { ScanVaultsDialog } from '@components/ScanVaults/ScanVaultsDialog'
import { useMemo } from 'react'

export const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const activeTeams = useRecoilValue(activeTeamsState)
  const devMode = useDevMode()
  const location = useLocation()

  const hideSideBar = useMemo(
    () =>
      location.pathname.startsWith('/add-multisig') ||
      location.pathname.startsWith('/connect') ||
      location.pathname.startsWith('/sign'),
    [location.pathname]
  )

  const requiresMultisig = useMemo(() => !location.pathname.startsWith('/add-multisig'), [location.pathname])

  return (
    <div className="flex flex-col w-full min-h-screen gap-[16px] p-[24px] flex-1">
      <Header />
      <section className="flex w-full flex-1 gap-[16px]">
        {requiresMultisig && (!activeTeams || activeTeams.length === 0) ? (
          // loading multisigs from backend
          activeTeams === undefined ? (
            <div css={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <EyeOfSauronProgressIndicator />
            </div>
          ) : (
            <Navigate to="/add-multisig?redirect=self" />
          )
        ) : (
          <>
            {!hideSideBar && (
              <Sidebar
                sections={[
                  {
                    name: 'Vault',
                    options: [
                      {
                        name: 'Overview',
                        icon: <Eye />,
                        href: '/overview',
                      },
                      {
                        name: 'Send',
                        icon: <Send />,
                        href: '/send',
                      },
                      {
                        name: 'Multi-send',
                        icon: <Share2 />,
                        href: '/multisend',
                      },
                      {
                        name: 'Voting',
                        icon: <Vote />,
                        href: '/voting',
                      },
                      {
                        name: 'Staking',
                        icon: <Zap />,
                        href: '/staking',
                      },
                      {
                        name: 'Address Book',
                        icon: <Users />,
                        href: '/address-book',
                      },
                    ],
                  },
                  {
                    name: 'Advanced',
                    options: [
                      {
                        name: 'Dapps',
                        icon: <Globe />,
                        href: '/dapps',
                        // hidden: !devMode,
                      },
                      {
                        name: 'Smart Contracts',
                        icon: <Contract />,
                        href: '/smart-contracts',
                      },
                      {
                        name: 'Call data',
                        icon: <List />,
                        href: '/custom-call-data',
                      },
                      {
                        name: 'Collaborators',
                        icon: <UserPlus />,
                        href: '/collaborators',
                      },
                      {
                        name: 'Wallet Connect',
                        icon: <WalletConnectLogo className="w-[24px] h-[24px]" />,
                        href: '/wallet-connect',
                      },
                      {
                        name: 'Settings',
                        icon: <Settings />,
                        href: '/settings',
                      },
                    ],
                  },
                ]}
              />
            )}
            {children}
            {!!activeTeams?.length && <BetaNotice />}
            <ScanVaultsDialog />
            <WalletConnectRequest />
          </>
        )}
      </section>
      <Footer />
    </div>
  )
}

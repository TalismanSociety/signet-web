import { Contract, Eye, Globe, List, Send, Settings, Share2, Users, Vote, Zap } from '@talismn/icons'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { EyeOfSauronProgressIndicator } from '@talismn/ui'
import { useRecoilValue } from 'recoil'
import { activeMultisigsState } from '@domains/multisig'
import { activeTeamsState } from '../domains/offchain-data'
import { Navigate } from 'react-router-dom'
import BetaNotice from './Overview/BetaNotice'
import { useDevMode } from '../domains/common/useDevMode'

export const Layout: React.FC<
  React.PropsWithChildren & { selected?: string; requiresMultisig?: boolean; hideSideBar?: boolean }
> = ({ children, selected, requiresMultisig, hideSideBar }) => {
  const multisigs = useRecoilValue(activeMultisigsState)
  const activeTeams = useRecoilValue(activeTeamsState)
  const devMode = useDevMode()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: '100vh',
        gap: 16,
        padding: 24,
        flex: 1,
      }}
    >
      <Header />
      <div css={{ display: 'flex', flex: 1, gap: 16 }}>
        {requiresMultisig && (!activeTeams || multisigs.length === 0) ? (
          // loading multisigs from backend
          !activeTeams ? (
            <div css={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <EyeOfSauronProgressIndicator />
            </div>
          ) : (
            <Navigate to="/add-vault" />
          )
        ) : (
          <>
            {!hideSideBar && (
              <Sidebar
                selected={selected}
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
                        hidden: !devMode,
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
            {multisigs.length && <BetaNotice />}
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}

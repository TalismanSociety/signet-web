import { createBrowserRouter } from 'react-router-dom'

import Landing from '../layouts/Landing'
import Overview from '../layouts/Overview'
import Settings from '../layouts/Settings'
import RequireAuth from '../layouts/Auth/RequireAuth'
import Send from '../layouts/NewTransaction/Send'
import { AddressBook } from '../layouts/AddressBook'
import { AddVault } from '../layouts/AddVault'
import MultiSend from '../layouts/NewTransaction/Multisend'
import Vote from '../layouts/NewTransaction/Vote'
import Advanced from '../layouts/NewTransaction/Advanced'
import Staking from '../layouts/Staking'
import { Dapps } from '../layouts/Dapps'
import { SignetConnect } from '../layouts/Connect'
import { Sign } from '../layouts/Sign'
import SmartContracts from '../layouts/SmartContracts'
import { Collaborators } from '../layouts/Collaborators'
import { WalletConnectPage } from '../layouts/WalletConnect'
import { WalletConnectSessionsPage } from '../layouts/WalletConnect/SessionsPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/add-vault/*',
    element: (
      <RequireAuth requireSignIn>
        <AddVault />
      </RequireAuth>
    ),
  },
  {
    path: '/overview/*',
    element: (
      <RequireAuth requireSignIn>
        <Overview />
      </RequireAuth>
    ),
  },
  {
    path: '/send',
    element: (
      <RequireAuth requireSignIn>
        <Send />
      </RequireAuth>
    ),
  },
  {
    path: '/multisend',
    element: (
      <RequireAuth requireSignIn>
        <MultiSend />
      </RequireAuth>
    ),
  },
  {
    path: '/voting',
    element: (
      <RequireAuth requireSignIn>
        <Vote />
      </RequireAuth>
    ),
  },
  {
    path: '/staking',
    element: (
      <RequireAuth requireSignIn>
        <Staking />
      </RequireAuth>
    ),
  },
  {
    path: '/custom-call-data',
    element: (
      <RequireAuth requireSignIn>
        <Advanced />
      </RequireAuth>
    ),
  },
  {
    path: '/dapps',
    element: (
      <RequireAuth requireSignIn>
        <Dapps />
      </RequireAuth>
    ),
  },
  {
    path: '/collaborators',
    element: (
      <RequireAuth requireSignIn>
        <Collaborators />
      </RequireAuth>
    ),
  },
  {
    path: '/address-book',
    element: (
      <RequireAuth requireSignIn>
        <AddressBook />
      </RequireAuth>
    ),
  },
  {
    path: '/connect',
    element: (
      <RequireAuth requireSignIn>
        <SignetConnect />
      </RequireAuth>
    ),
  },
  {
    path: '/sign',
    element: (
      <RequireAuth requireSignIn>
        <Sign />
      </RequireAuth>
    ),
  },
  {
    path: '/smart-contracts/*',
    element: (
      <RequireAuth requireSignIn>
        <SmartContracts />
      </RequireAuth>
    ),
  },
  {
    path: '/wallet-connect',
    element: (
      <RequireAuth requireSignIn>
        <WalletConnectPage />
      </RequireAuth>
    ),
  },
  {
    path: '/wallet-connect/sessions',
    element: (
      <RequireAuth requireSignIn>
        <WalletConnectSessionsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/settings/*',
    element: (
      <RequireAuth requireSignIn>
        <Settings />
      </RequireAuth>
    ),
  },
])

export default router

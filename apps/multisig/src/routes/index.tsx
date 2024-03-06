import { Outlet, createBrowserRouter } from 'react-router-dom'

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
    path: '/*',
    element: (
      <RequireAuth requireSignIn>
        <Outlet />
      </RequireAuth>
    ),
    children: [
      {
        path: 'add-vault/*',
        element: <AddVault />,
      },
      {
        index: true,
        path: 'overview/*',
        element: <Overview />,
      },
      {
        path: 'send',
        element: <Send />,
      },
      {
        path: 'multisend',
        element: <MultiSend />,
      },
      {
        path: 'voting',
        element: <Vote />,
      },
      {
        path: 'staking',
        element: <Staking />,
      },
      {
        path: 'custom-call-data',
        element: <Advanced />,
      },
      {
        path: 'dapps',
        element: <Dapps />,
      },
      {
        path: 'collaborators',
        element: <Collaborators />,
      },
      {
        path: 'address-book',
        element: <AddressBook />,
      },
      {
        path: 'connect',
        element: <SignetConnect />,
      },
      {
        path: 'sign',
        element: <Sign />,
      },
      {
        path: 'smart-contracts/*',
        element: <SmartContracts />,
      },
      {
        path: 'wallet-connect',
        element: <WalletConnectPage />,
      },
      {
        path: 'wallet-connect/sessions',
        element: <WalletConnectSessionsPage />,
      },
      {
        path: 'settings/*',
        element: <Settings />,
      },
    ],
  },
])

export default router

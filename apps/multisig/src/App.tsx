import '@polkadot/api-augment/polkadot'
import '@polkadot/api-augment/substrate'
import 'react-loading-skeleton/dist/skeleton.css'

import './styles/styles.css'
import './index.css'

import { BalancesWatcher } from '@domains/balances'
import { ExtensionWatcher } from '@domains/extension'
import { ToastBar } from '@talismn/ui'
import { Analytics } from '@vercel/analytics/react'
import React, { Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import { RouterProvider } from 'react-router-dom'
import { RecoilRoot } from 'recoil'

import ThemeProvider from './App.Theme'
import router from './routes'
import { AccountWatcher } from '@domains/auth'
import { OffchainDataWatcher } from '@domains/offchain-data/offchain-watcher'
import { ActiveMultisigWatcher } from './domains/multisig'
import { ValidatorsWatcher } from './domains/staking/ValidatorsWatcher'
import ConstsWatcher from './domains/chains/ConstsWatcher'
import { Toaster as NewToaster } from '@components/ui/toaster'
import { HasuraProvider } from '@domains/offchain-data/hasura'
import { AzeroIDResolverProvider } from '@domains/azeroid/AzeroIDResolver'
import { WalletConnectProvider } from '@domains/wallet-connect'
import { SkeletonLayout } from './layouts/SkeletonLayout'
import { Helmet } from 'react-helmet'
import { CONFIG } from '@lib/config'
import SelectedChainBalancesProvider from './providers/SelectedChainBalancesProvider'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const App: React.FC = () => {
  const queryClient = new QueryClient()

  return (
    <ThemeProvider>
      <RecoilRoot>
        <SelectedChainBalancesProvider>
          <HasuraProvider>
            <AzeroIDResolverProvider>
              <Suspense fallback={<SkeletonLayout />}>
                <WalletConnectProvider>
                  <Helmet>
                    <title>{CONFIG.IS_POLKADOT_MULTISIG ? 'Polkadot Multisig by Signet' : 'Signet'}</title>
                  </Helmet>
                  <Analytics />
                  {/* <PendingTransactionsWatcher /> */}
                  <BalancesWatcher />
                  <ExtensionWatcher />
                  <AccountWatcher />
                  <OffchainDataWatcher />
                  <ValidatorsWatcher />
                  <ActiveMultisigWatcher />
                  <ConstsWatcher />
                  <QueryClientProvider client={queryClient}>
                    <RouterProvider router={router} />
                    <ReactQueryDevtools initialIsOpen={false} />
                  </QueryClientProvider>
                  <Toaster position="top-right" containerStyle={{ top: '6.4rem' }}>
                    {t => <ToastBar toast={t} />}
                  </Toaster>
                  <NewToaster />
                </WalletConnectProvider>
              </Suspense>
            </AzeroIDResolverProvider>
          </HasuraProvider>
        </SelectedChainBalancesProvider>
      </RecoilRoot>
    </ThemeProvider>
  )
}

export default App

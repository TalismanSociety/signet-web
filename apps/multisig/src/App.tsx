import '@polkadot/api-augment/polkadot'
import '@polkadot/api-augment/substrate'
import 'react-loading-skeleton/dist/skeleton.css'

import './styles/styles.css'
import './index.css'

import { BalancesWatcher } from '@domains/balances'
import { ExtensionWatcher } from '@domains/extension'
import { BalancesProvider } from '@talismn/balances-react'
import { ToastBar } from '@talismn/ui'
import { Analytics } from '@vercel/analytics/react'
import React, { Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import { RouterProvider } from 'react-router-dom'
import { RecoilRoot } from 'recoil'

import ThemeProvider from './App.Theme'
import router from './routes'
import { supportedChains } from '@domains/chains'
import { AccountWatcher } from '@domains/auth'
import { OffchainDataWatcher } from '@domains/offchain-data/offchain-watcher'
import { ActiveMultisigWatcher } from './domains/multisig'
import { NomPoolsWatcher } from './domains/staking'
import { ValidatorsWatcher } from './domains/staking/ValidatorsWatcher'
import ConstsWatcher from './domains/chains/ConstsWatcher'
import { Toaster as NewToaster } from '@components/ui/toaster'
import { HasuraProvider } from '@domains/offchain-data/hasura'
import { AzeroIDResolverProvider } from '@domains/azeroid/AzeroIDResolver'
import { WalletConnectProvider } from '@domains/wallet-connect'
import { SkeletonLayout } from './layouts/SkeletonLayout'
import { Helmet } from 'react-helmet'
import { CONFIG } from '@lib/config'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const App: React.FC = () => {
  const queryClient = new QueryClient()
  return (
    <ThemeProvider>
      <RecoilRoot>
        <BalancesProvider
          withTestnets
          enabledChains={supportedChains.map(chain => chain.genesisHash)}
          coingeckoApiUrl="https://coingecko.talismn.workers.dev"
        >
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
                  <NomPoolsWatcher />
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
        </BalancesProvider>
      </RecoilRoot>
    </ThemeProvider>
  )
}

export default App

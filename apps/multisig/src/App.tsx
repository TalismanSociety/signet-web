import '@polkadot/api-augment/polkadot'
import '@polkadot/api-augment/substrate'
import 'react-loading-skeleton/dist/skeleton.css'

import './styles/styles.css'
import './index.css'

import { BalancesWatcher } from '@domains/balances'
import { ExtensionWatcher } from '@domains/extension'
import { balanceModules } from '@talismn/balances-default-modules'
import { BalancesProvider } from '@talismn/balances-react'
import { EyeOfSauronProgressIndicator } from '@talismn/ui'
import { ToastBar } from '@talismn/ui'
import React, { Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import { RouterProvider } from 'react-router-dom'
import { RecoilRoot } from 'recoil'

import ThemeProvider from './App.Theme'
import router from './routes'
import { supportedChains } from '@domains/chains'
import { AccountWatcher } from '@domains/auth'
import { OffchainDataWatcher } from '@domains/offchain-data/offchain-watcher'
import { ActiveMultisigWatcher, PendingTransactionsWatcher } from './domains/multisig'
import { NomPoolsWatcher } from './domains/staking'
import { ValidatorsWatcher } from './domains/staking/ValidatorsWatcher'
import ConstsWatcher from './domains/chains/ConstsWatcher'
import { Toaster as NewToaster } from '@components/ui/toaster'
import { HasuraProvider } from '@domains/offchain-data/hasura'
import { AzeroIDResolverProvider } from '@domains/azeroid/AzeroIDResolver'
import { WalletConnectProvider } from '@domains/wallet-connect'

const Loader = () => {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        left: 0,
        right: 0,
      }}
    >
      <EyeOfSauronProgressIndicator />
    </div>
  )
}

const App: React.FC = () => (
  <ThemeProvider>
    <RecoilRoot>
      <BalancesProvider
        balanceModules={balanceModules}
        withTestnets
        enabledChains={supportedChains.map(chain => chain.genesisHash)}
        coingeckoApiUrl="https://coingecko.talismn.workers.dev"
      >
        <HasuraProvider>
          <AzeroIDResolverProvider>
            <Suspense fallback={<Loader />}>
              <WalletConnectProvider>
                <PendingTransactionsWatcher />
                <BalancesWatcher />
                <ExtensionWatcher />
                <AccountWatcher />
                <OffchainDataWatcher />
                <NomPoolsWatcher />
                <ValidatorsWatcher />
                <ActiveMultisigWatcher />
                <ConstsWatcher />
                <RouterProvider router={router} />
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

export default App

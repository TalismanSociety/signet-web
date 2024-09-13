import { BalancesProvider } from '@talismn/balances-react'
import { ReactNode } from 'react'
import { useSelectedMultisig } from '@domains/multisig'
import { DUMMY_MULTISIG_ID } from '@util/constants'

const SelectedChainBalancesProvider = ({ children }: { children: ReactNode }) => {
  const [multisig] = useSelectedMultisig()

  const selectedChainHash = multisig.id === DUMMY_MULTISIG_ID ? '' : multisig.chain.genesisHash

  return (
    <BalancesProvider
      withTestnets
      enabledChains={[selectedChainHash || '']}
      coingeckoApiUrl="https://coingecko.talismn.workers.dev"
    >
      {children}
    </BalancesProvider>
  )
}

export default SelectedChainBalancesProvider

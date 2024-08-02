import { supportedChains } from './generated-chains'

export const filteredSupportedChains = supportedChains.filter(chain => {
  const networks = process.env.REACT_APP_NETWORKS

  if (!networks) return true
  const whitelistedNetworks = networks.split(',')

  for (const network of whitelistedNetworks) {
    if (process.env.REACT_APP_NETWORKS === 'testnet') {
      return chain.isTestnet
    }

    if (process.env.REACT_APP_NETWORKS === 'non-testnet') {
      return !chain.isTestnet
    }

    const networkLowerCase = network.toLowerCase()
    const match = chain.id.toLowerCase() === networkLowerCase || chain.chainName === networkLowerCase
    if (match) return true
  }

  return false
})

export { supportedChains }

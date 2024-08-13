export type Rpc = {
  url: string
}

export type SupportedChain = {
  id: string
  polkaAssemblyUrl?: string
  subscanUrl?: string
  rpcs?: Array<Rpc>
  logo?: string
}

export const SUPPORTED_CHAINS: Record<string, SupportedChain> = {
  'polkadot': {
    id: 'polkadot',
    polkaAssemblyUrl: 'https://polkadot.polkassembly.io',
  },
  'astar': { id: 'astar', polkaAssemblyUrl: 'https://astar.polkassembly.io' },
  'centrifuge-polkadot': { id: 'centrifuge', polkaAssemblyUrl: 'https://centrifuge.polkassembly.io' },
  'hydradx': { id: 'hydradx', polkaAssemblyUrl: 'https://centrifuge.polkassembly.io' },
  'kusama': { id: 'kusama', polkaAssemblyUrl: 'https://kusama.polkassembly.io' },
  'rococo': { id: 'rococo', polkaAssemblyUrl: 'https://rococo.polkassembly.io' },
  'aleph-zero-testnet': { id: 'aleph-zero-testnet', subscanUrl: 'https://test.azero.dev/#/explorer/' },
  'dancebox': { id: 'dancebox', subscanUrl: 'https://dancebox.subscan.io/' },
  'paseo-testnet': { id: 'paseo-testnet', subscanUrl: 'https://paseo.subscan.io/' },
  'rococo-neuro-web-testnet': { id: 'rococo-neuro-web-testnet', subscanUrl: 'https://neuroweb-testnet.subscan.io/' },
  'avail-turing-testnet': {
    id: 'avail-turing-testnet',
    subscanUrl: 'https://temp-explorer.avail.so/#/explorer',
    logo: 'https://www.availproject.org/_next/static/media/logo_large.80d5666f.png',
  },
  'polimec': { id: 'polimec', subscanUrl: 'https://explorer.polimec.org/polimec/' },
  'bittensor': {
    id: 'bittensor',
    subscanUrl: 'https://bittensor.com/scan',
    rpcs: [{ url: `wss://bittensor-finney.api.onfinality.io/ws?apikey=` }],
  },
  'polkadot-asset-hub': { id: 'polkadot-asset-hub' },
  'kusama-asset-hub': { id: 'kusama-asset-hub' },
  'acala': { id: 'acala' },
  'aleph-zero': { id: 'aleph-zero' },
  'bifrost-polkadot': { id: 'bifrost-polkadot' },
  'bifrost-kusama': { id: 'bifrost-kusama' },
  'interlay': { id: 'interlay' },
  'karura': { id: 'karura' },
  'khala': { id: 'khala' },
  'kintsugi': { id: 'kintsugi' },
  'moonbeam': { id: 'moonbeam' },
  'phala': { id: 'phala' },
  'rococo-testnet': { id: 'rococo-testnet' },
  'shibuya-testnet': { id: 'shibuya-testnet' },
}

export type Chain = {
  id: string
  genesisHash: string
  chainName: string
  logo: string
  isTestnet: boolean
  nativeToken: {
    id: string
  }
  rpcs: Rpc[]
  ss58Prefix: number
  subscanUrl: string
  polkaAssemblyUrl?: string
}

export const CUSTOM_CHAINS: Omit<Chain, 'id'>[] = [
  // example of custom chain
  // {
  //   chainName: 'Avail Turing Network',
  //   genesisHash: '0xd3d2f3a3495dc597434a99d7d449ebad6616db45e4e4f178f31cc6fa14378b70',
  //   isTestnet: true,
  //   logo: 'https://www.availproject.org/_next/static/media/logo_large.80d5666f.png',
  //   nativeToken: {
  //     id: 'avail-turing-testnet-substrate-native',
  //   },
  //   rpcs: [{ url: 'wss://turing-rpc.avail.so' }],
  //   ss58Prefix: 42,
  //   subscanUrl: 'https://temp-explorer.avail.so/#/explorer',
  // },
]

export const CHAINDATA_URL = 'https://raw.githubusercontent.com/TalismanSociety/chaindata/main/dist/chains/all.json'

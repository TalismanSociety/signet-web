export type Rpc = {
  url: string
}

type Account = '*25519' | 'secp256k1'

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
    rpcs: [{ url: 'wss://polkadot.api.onfinality.io/rpc?apikey=' }],
  },
  'astar': {
    id: 'astar',
    polkaAssemblyUrl: 'https://astar.polkassembly.io',
    rpcs: [{ url: 'wss://astar.api.onfinality.io/rpc?apikey=' }],
  },
  'hydradx': {
    id: 'hydradx',
    polkaAssemblyUrl: 'https://centrifuge.polkassembly.io',
  },
  'kusama': {
    id: 'kusama',
    polkaAssemblyUrl: 'https://kusama.polkassembly.io',
    rpcs: [{ url: 'wss://assethub-kusama.api.onfinality.io/rpc?apikey=' }],
  },
  'rococo': {
    id: 'rococo',
    polkaAssemblyUrl: 'https://rococo.polkassembly.io',
  },
  'paseo-testnet': {
    id: 'paseo-testnet',
    subscanUrl: 'https://paseo.subscan.io/',
  },
  'polimec': {
    id: 'polimec',
    subscanUrl: 'https://explorer.polimec.org/polimec/',
  },
  'bittensor': {
    id: 'bittensor',
    subscanUrl: 'https://bittensor.com/scan',
    rpcs: [{ url: 'wss://bittensor-finney.api.onfinality.io/ws?apikey=' }],
  },
  'polkadot-asset-hub': {
    id: 'polkadot-asset-hub',
    rpcs: [{ url: 'wss://assethub-kusama.api.onfinality.io/rpc?apikey=' }],
  },
  'kusama-asset-hub': { id: 'kusama-asset-hub', rpcs: [{ url: 'wss://astar.api.onfinality.io/rpc?apikey=' }] },
  'acala': { id: 'acala' },
  'aleph-zero': { id: 'aleph-zero' },
  'bifrost-polkadot': { id: 'bifrost-polkadot', rpcs: [{ url: 'wss://astar.api.onfinality.io/rpc?apikey=' }] },
  'moonbeam': { id: 'moonbeam', rpcs: [{ url: 'wss://moonbeam.api.onfinality.io/rpc?apikey=' }] },
  'phala': { id: 'phala' },
  'rococo-testnet': { id: 'rococo-testnet' },
  'shibuya-testnet': { id: 'shibuya-testnet' },
  'mythos': {
    id: 'mythos',
    subscanUrl: 'https://mythos.subscan.io/',
  },

  // turned off due to inactivity
  // 'dancebox': { id: 'dancebox', subscanUrl: 'https://dancebox.subscan.io/' },
  // 'bifrost-kusama': { id: 'bifrost-kusama' },
  // 'centrifuge-polkadot': { id: 'centrifuge', polkaAssemblyUrl: 'https://centrifuge.polkassembly.io' },
  // 'interlay': { id: 'interlay' },
  // 'karura': { id: 'karura' },
  // 'khala': { id: 'khala' },
  // 'kintsugi': { id: 'kintsugi' },
  // 'rococo-neuro-web-testnet': { id: 'rococo-neuro-web-testnet', subscanUrl: 'https://neuroweb-testnet.subscan.io/' },
  // 'avail-turing-testnet': {
  //   id: 'avail-turing-testnet',
  //   subscanUrl: 'https://temp-explorer.avail.so/#/explorer',
  //   logo: 'https://www.availproject.org/_next/static/media/logo_large.80d5666f.png',
  // },
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
  account: Account
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

export const CHAINDATA_URL = 'https://raw.githubusercontent.com/TalismanSociety/chaindata/main/pub/v1/chains/all.json'

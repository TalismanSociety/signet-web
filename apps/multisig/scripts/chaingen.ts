const fs = require('fs')

type Rpc = {
  url: string
}

type Chain = {
  squidIds: {
    chainData: string
  }
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

const supportedChainIds = [
  'polkadot',
  'polkadot-asset-hub',
  'kusama',
  'kusama-asset-hub',
  'acala',
  'aleph-zero',
  'astar',
  'bifrost-polkadot',
  'bifrost-kusama',
  'centrifuge',
  'hydradx',
  'interlay',
  'karura',
  'khala',
  'kintsugi',
  'moonbeam',
  'phala',
  'rococo-testnet',
  'shibuya-testnet',
  'aleph-zero-testnet',
  'avail-turing-testnet',
  'dancebox',
  'paseo-testnet',
]

const polkaAssemblyUrl: Record<string, string> = {
  astar: 'https://astar.polkassembly.io',
  centrifuge: 'https://centrifuge.polkassembly.io',
  hydradx: 'https://centrifuge.polkassembly.io',
  kusama: 'https://kusama.polkassembly.io',
  polkadot: 'https://polkadot.polkassembly.io',
  rococo: 'https://rococo.polkassembly.io',
}

const subscanUrlsOverride: Record<string, string> = {
  'aleph-zero-testnet': 'https://test.azero.dev/#/explorer/',
  'dancebox': 'https://dancebox.subscan.io/',
  'paseo-testnet': 'https://paseo.subscan.io/',
  'avail-turing-testnet': 'https://temp-explorer.avail.so/#/explorer',
}

const networkLogoOverride: Record<string, string> = {
  'avail-turing-testnet': 'https://www.availproject.org/_next/static/media/logo_large.80d5666f.png',
}

const customChains: Chain[] = [
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
  //   squidIds: { chainData: 'avail-turing-testnet' },
  //   ss58Prefix: 42,
  //   subscanUrl: 'https://temp-explorer.avail.so/#/explorer',
  // },
]

const CHAINDATA_URL = 'https://raw.githubusercontent.com/TalismanSociety/chaindata/main/dist/chains/all.json'

const generateSupportedChains = async () => {
  const chaindata = (await fetch(CHAINDATA_URL).then(response => response.json())) as any
  const supportedChains: Chain[] = []

  for (const chainId of supportedChainIds) {
    // @ts-ignore
    const chain = chaindata.find(chain => chain.id === chainId)
    if (chain) {
      supportedChains.push({
        chainName: chain.name,
        genesisHash: chain.genesisHash,
        isTestnet: chain.isTestnet,
        logo: networkLogoOverride[chain.id] ?? chain.logo,
        nativeToken: {
          id: chain.nativeToken?.id,
        },
        rpcs: chain.rpcs,
        squidIds: { chainData: chain.id },
        ss58Prefix: chain.prefix,
        subscanUrl: subscanUrlsOverride[chain.id] ?? chain.subscanUrl,
        polkaAssemblyUrl: polkaAssemblyUrl[chain.id],
      })
    }
  }
  customChains.forEach(chain => supportedChains.push(chain))

  fs.writeFileSync(
    'src/domains/chains/generated-chains.ts',
    `
  import { Chain } from './tokens'

  export const supportedChains: Chain[] =  ${JSON.stringify(supportedChains, null, 2)}
  `
  )
}

generateSupportedChains()

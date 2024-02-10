import { Chain } from '.'

export const supportedChains: Chain[] = [
  {
    squidIds: { chainData: 'polkadot' },
    genesisHash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainName: 'Polkadot',
    logo: 'https://raw.githubusercontent.com/TalismanSociety/chaindata/v3/assets/chains/polkadot.svg',
    isTestnet: false,
    nativeToken: {
      id: 'polkadot-substrate-native',
    },
    subscanUrl: 'https://polkadot.subscan.io/',
    polkaAssemblyUrl: 'https://polkadot.polkassembly.io',
    rpcs: [
      {
        url: 'wss://rpc.polkadot.io',
      },
      {
        url: 'wss://rpc.ibp.network/polkadot',
      },
      {
        url: 'wss://rpc.dotters.network/polkadot',
      },
      {
        url: 'wss://polkadot.api.onfinality.io/public-ws',
      },
      {
        url: 'wss://1rpc.io/dot',
      },
      {
        url: 'wss://polkadot-public-rpc.blockops.network/ws',
      },
      {
        url: 'wss://polkadot-rpc.dwellir.com',
      },
      {
        url: 'wss://polkadot-rpc-tn.dwellir.com',
      },
      {
        url: 'wss://rpc-polkadot.luckyfriday.io',
      },
      {
        url: 'wss://polkadot.public.curie.radiumblock.co/ws',
      },
      {
        url: 'wss://dot-rpc.stakeworld.io',
      },
    ],
    ss58Prefix: 0,
  },
  {
    squidIds: { chainData: 'kusama' },
    genesisHash: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    chainName: 'Kusama',
    logo: 'https://raw.githubusercontent.com/TalismanSociety/chaindata/v3/assets/chains/kusama.svg',
    isTestnet: false,
    nativeToken: {
      id: 'kusama-substrate-native',
    },
    subscanUrl: 'https://kusama.subscan.io/',
    polkaAssemblyUrl: 'https://kusama.polkassembly.io',
    rpcs: [
      {
        url: 'wss://kusama-rpc.polkadot.io',
      },
      {
        url: 'wss://rpc.ibp.network/kusama',
      },
      {
        url: 'wss://rpc.dotters.network/kusama',
      },
      {
        url: 'wss://kusama.api.onfinality.io/public-ws',
      },
      {
        url: 'wss://1rpc.io/ksm',
      },
      {
        url: 'wss://kusama-public-rpc.blockops.network/ws',
      },
      {
        url: 'wss://kusama-rpc.dwellir.com',
      },
      {
        url: 'wss://kusama-rpc-tn.dwellir.com',
      },
      {
        url: 'wss://rpc-kusama.luckyfriday.io',
      },
      {
        url: 'wss://kusama.public.curie.radiumblock.co/ws',
      },
      {
        url: 'wss://ksm-rpc.stakeworld.io',
      },
    ],
    ss58Prefix: 2,
  },
  {
    squidIds: { chainData: 'polkadot-asset-hub' },
    genesisHash: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    chainName: 'Polkadot Asset Hub',
    nativeToken: {
      id: 'polkadot-asset-hub-substrate-native',
    },
    subscanUrl: 'https://assethub-polkadot.subscan.io/',
    rpcs: [
      {
        url: 'wss://polkadot-asset-hub-rpc.polkadot.io',
      },
      {
        url: 'wss://sys.ibp.network/statemint',
      },
      {
        url: 'wss://sys.dotters.network/statemint',
      },
      {
        url: 'wss://statemint.api.onfinality.io/public-ws',
      },
      {
        url: 'wss://statemint-rpc.dwellir.com',
      },
      {
        url: 'wss://statemint-rpc-tn.dwellir.com',
      },
      {
        url: 'wss://statemint.public.curie.radiumblock.co/ws',
      },
      {
        url: 'wss://dot-rpc.stakeworld.io/statemint',
      },
    ],
    logo: 'https://raw.githubusercontent.com/TalismanSociety/chaindata/v3/assets/chains/polkadot-asset-hub.svg',
    isTestnet: false,
    ss58Prefix: 0,
  },
  {
    squidIds: { chainData: 'kusama-asset-hub' },
    genesisHash: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    chainName: 'Kusama Asset Hub',
    nativeToken: {
      id: 'kusama-asset-hub-substrate-native',
    },
    subscanUrl: 'https://assethub-kusama.subscan.io/',
    rpcs: [
      {
        url: 'wss://kusama-asset-hub-rpc.polkadot.io',
      },
      {
        url: 'wss://sys.ibp.network/statemine',
      },
      {
        url: 'wss://sys.dotters.network/statemine',
      },
      {
        url: 'wss://statemine.api.onfinality.io/public-ws',
      },
      {
        url: 'wss://statemine-rpc.dwellir.com',
      },
      {
        url: 'wss://statemine-rpc-tn.dwellir.com',
      },
      {
        url: 'wss://rpc-statemine.luckyfriday.io',
      },
      {
        url: 'wss://statemine.public.curie.radiumblock.co/ws',
      },
      {
        url: 'wss://ksm-rpc.stakeworld.io/statemine',
      },
    ],
    logo: 'https://raw.githubusercontent.com/TalismanSociety/chaindata/v3/assets/chains/kusama-asset-hub.svg',
    isTestnet: false,
    ss58Prefix: 2,
  },
  // {
  //   squidIds: { chainData: 'hydradx' },
  //   genesisHash: '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d',
  //   chainName: 'HydraDX',
  //   nativeToken: {
  //     id: 'hydradx-substrate-native-hdx',
  //   },
  //   subscanUrl: 'https://hydradx.subscan.io/',
  //   rpcs: [
  //     {
  //       url: 'wss://hydradx-rpc.dwellir.com',
  //     },
  //     {
  //       url: 'wss://rpc.hydradx.cloud',
  //     },
  //     {
  //       url: 'wss://rpc-lb.data6.zp-labs.net:8443/hydradx/ws/?token=2ZGuGivPJJAxXiT1hR1Yg2MXGjMrhEBYFjgbdPi',
  //     },
  //     {
  //       url: 'wss://hydradx.api.onfinality.io/public-ws',
  //     },
  //   ],
  //   logo: 'https://raw.githubusercontent.com/TalismanSociety/chaindata/v3/assets/chains/hydradx.svg',
  //   isTestnet: false,
  //   ss58Prefix: 63,
  // },
  // {
  //   squidIds: { chainData: 'aleph-zero' },
  //   genesisHash: '0x70255b4d28de0fc4e1a193d7e175ad1ccef431598211c55538f1018651a0344e',
  //   chainName: 'Aleph Zero',
  //   nativeToken: {
  //     id: 'aleph-zero-substrate-native-azero',
  //   },
  //   subscanUrl: 'https://alephzero.subscan.io/',
  //   rpcs: [
  //     {
  //       "url": "wss://aleph-zero-rpc.dwellir.com"
  //     },
  //     {
  //       "url": "wss://ws.azero.dev"
  //     }
  //   ],
  //   logo: 'https://raw.githubusercontent.com/TalismanSociety/chaindata/v3/assets/chains/aleph-zero.svg',
  //   isTestnet: false,
  //   ss58Prefix: 42,
  // },
  {
    squidIds: { chainData: 'rococo-testnet' },
    genesisHash: '0x6408de7737c59c238890533af25896a2c20608d8b380bb01029acb392781063e',
    chainName: 'Rococo',
    logo: 'https://raw.githubusercontent.com/TalismanSociety/chaindata/v3/assets/chains/rococo-testnet.svg',
    isTestnet: true,
    subscanUrl: 'https://rococo.subscan.io/',
    nativeToken: {
      id: 'rococo-testnet-substrate-native',
    },
    rpcs: [
      {
        url: 'wss://rococo-rpc.polkadot.io',
      },
      {
        url: 'wss://rpc-rococo.bajun.network',
      },
    ],
    ss58Prefix: 42,
  },
  {
    squidIds: { chainData: 'astar' },
    genesisHash: '0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6',
    chainName: 'Astar',
    isTestnet: false,
    nativeToken: {
      id: 'astar-substrate-native',
    },
    subscanUrl: 'https://astar.subscan.io/',
    rpcs: [
      {
        url: 'wss://astar-rpc.dwellir.com',
      },
      {
        url: 'wss://1rpc.io/astr',
      },
      {
        url: 'wss://rpc.astar.network',
      },
      {
        url: 'wss://astar.public.curie.radiumblock.co/ws',
      },
    ],
    logo: 'https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/astar.svg',
    ss58Prefix: 5,
  },
  {
    squidIds: { chainData: 'shibuya-testnet' },
    genesisHash: '0xddb89973361a170839f80f152d2e9e38a376a5a7eccefcade763f46a8e567019',
    chainName: 'Shibuya',
    nativeToken: {
      id: 'shibuya-testnet-substrate-native',
    },
    subscanUrl: 'https://shibuya.subscan.io/',
    rpcs: [
      {
        url: 'wss://shibuya-rpc.dwellir.com',
      },
      {
        url: 'wss://rpc.shibuya.astar.network',
      },
    ],
    logo: 'https://raw.githubusercontent.com/TalismanSociety/chaindata/v3/assets/chains/shibuya-testnet.svg',
    isTestnet: true,
    ss58Prefix: 5,
  },
]

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
    const match = chain.squidIds.chainData.toLowerCase() === networkLowerCase || chain.chainName === networkLowerCase
    if (match) return true
  }

  return false
})

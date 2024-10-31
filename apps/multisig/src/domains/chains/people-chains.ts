export const peopleChains = {
  'polkadot': {
    chainName: 'Polkadot People Network',
    id: 'polkadot-people',
    rpcs: [{ url: 'wss://polkadot-people-rpc.polkadot.io/' }, { url: 'wss://rpc-people-polkadot.luckyfriday.io/' }],
    genesisHash: '0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008',
  },
  'kusama': {
    chainName: 'Kusama People Network',
    id: 'kusama-people',
    rpcs: [
      { url: 'wss://kusama-people-rpc.polkadot.io/' },
      { url: 'wss://people-kusama-rpc.dwellir.com/' },
      { url: 'wss://sys.ibp.network/coretime-kusama/' },
    ],
    genesisHash: '0xc1af4cb4eb3918e5db15086c0cc5ec17fb334f728b7c65dd44bfe1e174ff8b3f',
  },
  'paseo-testnet': {
    chainName: 'Paseo People Network',
    id: 'paseo-people',
    rpcs: [
      {
        url: 'wss://people-paseo.rpc.amforc.com/',
      },
    ],
    genesisHash: '0xe6c30d6e148f250b887105237bcaa5cb9f16dd203bf7b5b9d4f1da7387cb86ec',
  },
}

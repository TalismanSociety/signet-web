import { SupportedChainIds } from '../../domains/chains/generated-chains'

export type SupportedDapp = {
  name: string
  /** some dapps have different url on different chain. When `url` is an object, the urls are keyed by genesis hash */
  url: string | Partial<Record<SupportedChainIds, string>>
  logo: string
  background?: string
}

export const SUPPORTED_DAPPS: SupportedDapp[] = [
  {
    name: 'Talisman Portal',
    url: 'https://app.talisman.xyz',
    logo: 'https://baserow-media.ams3.digitaloceanspaces.com/user_files/FHK0FnP0QiV7WAQ9DMQx80q3rJ1GSKx2_daa9e0c73cfb52476abeebfd2d952bc79070b0bfb01bad849441bf2c53cdd6b7.svg',
  },
  {
    name: 'Subsquare',
    url: {
      'polkadot': 'https://polkadot.subsquare.io',

      'bifrost-polkadot': 'https://bifrost.subsquare.io',
      'rococo-testnet': 'https://rococo.subsquare.io',
      'acala': 'https://acala.subsquare.io',
      'hydradx': 'https://hydradx.subsquare.io',
      'kusama': 'https://kusama.subsquare.io',
      'phala': 'https://phala.subsquare.io',
      'moonbeam': 'https://moonbeam.subsquare.io',

      // inactivity
      // 'bifrost-kusama': 'https://bifrost-kusama.subsquare.io',
      // 'centrifuge-polkadot': 'https://centrifuge.subsquare.io',
      // 'interlay': 'https://interlay.subsquare.io',
      // 'karura': 'https://karura.subsquare.io',
      // 'khala': 'https://khala.subsquare.io',
      // 'kintsugi': 'https://kintsugi.subsquare.io',
    },
    logo: 'https://subsquare.io/imgs/logo-img.svg',
    background: '#fff',
  },
]

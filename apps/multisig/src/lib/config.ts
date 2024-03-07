const IS_POLKADOT_MULTISIG = Boolean(JSON.parse(`${process.env.REACT_APP_POLKADOT_MULTISIG ?? false}`))

export const CONFIG = {
  SIGNET_LANDING_PAGE: process.env.REACT_APP_SIGNET_LANDING_PAGE || 'https://talisman.xyz/signet',
  CONTACT_EMAIL: process.env.REACT_APP_CONTACT_EMAIL || 'signet@talisman.xyz',
  APP_NAME: process.env.REACT_APP_APPLICATION_NAME || 'Signet',
  IS_POLKADOT_MULTISIG: IS_POLKADOT_MULTISIG,
}

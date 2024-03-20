import React from 'react'

import { CONFIG } from '@lib/config'
import { PolkadotMultisigLogo } from './PolkadotMultisig'
import { SignetLogo } from './SignetLogo'

export default function Logo(props: React.HTMLAttributes<HTMLDivElement>) {
  if (CONFIG.IS_POLKADOT_MULTISIG) return <PolkadotMultisigLogo wrapped {...props} />
  return <SignetLogo {...props} />
}

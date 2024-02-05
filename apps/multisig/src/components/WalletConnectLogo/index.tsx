import React from 'react'

import { ReactComponent as LogoSvg } from './logo.svg'

export default function WalletConnectLogo(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props}>
      <LogoSvg />
    </div>
  )
}

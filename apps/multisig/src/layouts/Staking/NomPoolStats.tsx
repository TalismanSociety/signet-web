import { Chain, useNativeToken } from '@domains/chains'
import { BondedPool } from '@domains/nomination-pools'
import { formatUnits } from '@util/numbers'
import { SettingsInfoRow } from '../../layouts/Settings/InfoRow'

import React from 'react'

type Props = {
  chain: Chain
  pool: BondedPool
}

export const NomPoolStats: React.FC<Props> = ({ chain, pool }) => {
  const { nativeToken } = useNativeToken(chain.nativeToken.id)

  return (
    <div css={{ display: 'flex', gap: 24, flexDirection: 'column', width: '100%' }}>
      <SettingsInfoRow label="Total Bonded Amount">
        <p className="text-[16px] text-offWhite">
          {pool && nativeToken
            ? `${(+formatUnits(pool.points, nativeToken?.decimals)).toLocaleString()} ${nativeToken.symbol}`
            : ''}
        </p>
      </SettingsInfoRow>
      <SettingsInfoRow label="Members">
        <p className="text-[16px] text-offWhite">{pool?.memberCounter.toLocaleString()}</p>
      </SettingsInfoRow>
      <SettingsInfoRow label="State">
        <p className="text-[16px] text-offWhite">{pool?.state}</p>
      </SettingsInfoRow>
    </div>
  )
}

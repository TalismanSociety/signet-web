import { ProxyDefinition } from '@domains/multisig'
import { CircularProgressIndicator } from '@talismn/ui'
import { Fragment } from 'react'
import { secondsToDuration } from '@util/misc'

type Props = {
  proxies?: ProxyDefinition[]
}

const Pill: React.FC<{ value: string | number; suffix?: string }> = ({ value, suffix }) => {
  return (
    <div
      css={({ color }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        backgroundColor: color.surface,
        borderRadius: 8,
        padding: '8px 12px',
        p: { color: color.offWhite },
      })}
    >
      <p>{value}</p>
      {suffix !== undefined && <p css={{ fontSize: 14 }}>{suffix}</p>}
    </div>
  )
}

export const ProxiesSettings: React.FC<Props> = ({ proxies }) => (
  <div className="flex flex-col gap-[8px]">
    <p className="text-offWhite text-[14px] mt-[2px]">Proxy Relationships</p>
    <div className="grid grid-cols-2 gap-[16px]">
      <p className="text-gray-200 text-[14px] mt-[2px]">Proxy Type</p>
      <p className="text-gray-200 text-[14px] mt-[2px]">Time Delay</p>
    </div>
    {proxies === undefined ? (
      <CircularProgressIndicator size={16} />
    ) : proxies.length === 0 ? (
      <p className="text-offWhite">No proxy relationship found.</p>
    ) : (
      <div css={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', alignItems: 'flex-start' }}>
        {proxies.map(({ proxyType, delay, duration }, i) => (
          <Fragment key={i}>
            <Pill value={proxyType} />
            <div css={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Pill value={delay} suffix="Blocks" />
              <p css={({ color }) => ({ color: color.lightGrey })}>≈{secondsToDuration(duration)}</p>
            </div>
          </Fragment>
        ))}
      </div>
    )}
  </div>
)

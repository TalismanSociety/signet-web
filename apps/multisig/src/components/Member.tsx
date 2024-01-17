import { Chain } from '@domains/chains'
import { AugmentedAccount } from '@domains/multisig'
import { css } from '@emotion/css'
import { useTheme } from '@emotion/react'
import { Copy, Trash } from '@talismn/icons'
import { IconButton, Identicon } from '@talismn/ui'
import { shortenAddress } from '../util/addresses'
import { copyToClipboard } from '../domains/common'
import AddressTooltip from './AddressTooltip'

export const Member = ({
  m,
  a0Id,
  chain,
  onDelete,
}: {
  m: AugmentedAccount
  a0Id?: string
  onDelete?: () => void
  chain: Chain
}) => {
  const theme = useTheme()

  const ss58Address = m.address.toSs58(chain)
  return (
    <AddressTooltip address={ss58Address} chain={chain} a0Id={a0Id}>
      <div
        className={css`
          display: flex;
          align-items: center;
          background: var(--color-backgroundSecondary);
          border: 1px solid var(--color-backgroundSecondary);
          border-radius: 12px;
          padding: 8px 16px;
          gap: 8px;
        `}
      >
        <Identicon value={ss58Address} size={32} />
        <div css={{ display: 'grid', alignItems: 'center' }}>
          <p css={{ display: 'flex', marginTop: 4 }}>
            {m.nickname ? (
              <span css={({ color }) => ({ color: color.offWhite })}>{m.nickname}</span>
            ) : (
              <span css={{ color: 'var(--color-offWhite)' }}>{shortenAddress(ss58Address, 'long')}</span>
            )}
            &nbsp;
            {m.you && <span>(You)</span>}
          </p>
          {m.nickname ? <span css={{ fontSize: '12px' }}>{a0Id ?? m.address.toShortSs58(chain)}</span> : null}
        </div>
        <div css={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '8px' }}>
          {onDelete && (
            <IconButton size={16} contentColor={`rgb(${theme.foreground})`} onClick={onDelete}>
              <Trash size={16} />
            </IconButton>
          )}
          <IconButton
            size={16}
            contentColor={`rgb(${theme.foreground})`}
            css={{ cursor: 'pointer' }}
            onClick={() => copyToClipboard(ss58Address, `${shortenAddress(ss58Address)} copied to clipboard.`)}
          >
            <Copy size={16} />
          </IconButton>
        </div>
      </div>
    </AddressTooltip>
  )
}

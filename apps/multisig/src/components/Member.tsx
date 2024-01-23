import { Chain } from '@domains/chains'
import { AugmentedAccount } from '@domains/multisig'
import { css } from '@emotion/css'
import { useTheme } from '@emotion/react'
import { Copy, Trash } from '@talismn/icons'
import { IconButton, Identicon } from '@talismn/ui'
import { shortenAddress } from '../util/addresses'
import { copyToClipboard } from '../domains/common'
import { NameAndAddress } from './AddressInput/NameAndAddress'

export const Member = ({ m, chain, onDelete }: { m: AugmentedAccount; onDelete?: () => void; chain: Chain }) => {
  const theme = useTheme()

  const ss58Address = m.address.toSs58(chain)
  return (
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
      <div className="flex items-start gap-[8px] justify-start">
        <NameAndAddress name={m.nickname} address={m.address} chain={chain} breakLine />
        {m.you ? <span className="text-gray-200 text-[14px] leading-[16px]"> (You)</span> : null}
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
  )
}

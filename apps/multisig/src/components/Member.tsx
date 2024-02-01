import { Chain } from '@domains/chains'
import { AugmentedAccount } from '@domains/multisig'
import { useTheme } from '@emotion/react'
import { Copy, Trash } from '@talismn/icons'
import { IconButton, Identicon } from '@talismn/ui'
import { shortenAddress } from '../util/addresses'
import { copyToClipboard } from '../domains/common'
import { NameAndAddress } from './AddressInput/NameAndAddress'
import AddressTooltip from './AddressTooltip'
import useCopied from '@hooks/useCopied'
import { Check } from 'lucide-react'

export const Member = ({ m, chain, onDelete }: { m: AugmentedAccount; onDelete?: () => void; chain: Chain }) => {
  const theme = useTheme()
  const { copy, copied } = useCopied()
  const ss58Address = m.address.toSs58(chain)
  return (
    <AddressTooltip address={m.address} name={m.nickname} chain={chain}>
      <div
        className="flex items-center bg-gray-700 rounded-[12px] px-[16px] py-[8px] gap-[8px] cursor-pointer hover:bg-gray-500"
        onClick={() =>
          copy(ss58Address, 'Address Copied!', <p className="text-[12px]">{m.address.toShortSs58(chain)}</p>)
        }
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
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </IconButton>
        </div>
      </div>
    </AddressTooltip>
  )
}

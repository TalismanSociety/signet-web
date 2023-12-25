import { Identicon, Tooltip } from '@talismn/ui'
import { Chain } from '@domains/chains'
import { Address } from '@util/addresses'
import { NameAndAddress } from './NameAndAddress'
import { Copy } from '@talismn/icons'
import { copyToClipboard } from '@domains/common'

type Props = {
  chain?: Chain
  address: Address
  name?: string
  a0Id?: string
  disableCopy?: boolean
  nameOrAddressOnly?: boolean
  withAddressTooltip?: boolean
  identiconSize?: number
  breakLine?: boolean
}

export const AccountDetails: React.FC<Props> = ({
  chain,
  address,
  name,
  a0Id,
  disableCopy,
  nameOrAddressOnly,
  identiconSize = 24,
  withAddressTooltip,
  breakLine,
}) => {
  const accountDetailsUI = (
    <div css={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Identicon size={identiconSize} value={address.toSs58(chain)} />
      <NameAndAddress
        address={address}
        chain={chain}
        name={name}
        a0Id={a0Id}
        nameOrAddressOnly={nameOrAddressOnly}
        breakLine={breakLine}
      />
      {!disableCopy && (
        <div
          css={({ color }) => ({ color: color.lightGrey, height: 16, cursor: 'pointer' })}
          onClick={() => copyToClipboard(address.toSs58(chain), 'Address copied to clipboard')}
        >
          <Copy size={16} />
        </div>
      )}
    </div>
  )

  return withAddressTooltip ? (
    <Tooltip content={<p css={{ fontSize: 12 }}>{address.toSs58(chain)}</p>}>{accountDetailsUI}</Tooltip>
  ) : (
    accountDetailsUI
  )
}

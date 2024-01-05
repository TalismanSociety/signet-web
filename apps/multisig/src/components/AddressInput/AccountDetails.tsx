import { Identicon } from '@talismn/ui'
import { Chain } from '@domains/chains'
import { Address } from '@util/addresses'
import { NameAndAddress } from './NameAndAddress'
import { Copy } from '@talismn/icons'
import { copyToClipboard } from '@domains/common'
import AddressTooltip from '../AddressTooltip'

type Props = {
  chain?: Chain
  address: Address
  name?: string
  a0Id?: string
  a0IdAndAddress?: boolean
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
  a0IdAndAddress,
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
        a0IdAndAddress={a0IdAndAddress}
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
    <AddressTooltip name={name} address={address.toSs58(chain)} chain={chain}>
      {accountDetailsUI}
    </AddressTooltip>
  ) : (
    accountDetailsUI
  )
}

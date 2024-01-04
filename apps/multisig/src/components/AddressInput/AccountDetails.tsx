import { Identicon } from '@talismn/ui'
import { Chain } from '@domains/chains'
import { Address } from '@util/addresses'
import { NameAndAddress } from './NameAndAddress'
import { Copy } from '@talismn/icons'
import AddressTooltip from '../AddressTooltip'
import useCopied from '@hooks/useCopied'

type Props = {
  chain?: Chain
  address: Address
  name?: string
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
  disableCopy,
  nameOrAddressOnly,
  identiconSize = 24,
  withAddressTooltip,
  breakLine,
}) => {
  const { copy } = useCopied()
  const accountDetailsUI = (
    <div css={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Identicon size={identiconSize} value={address.toSs58(chain)} />
      <NameAndAddress
        address={address}
        chain={chain}
        name={name}
        nameOrAddressOnly={nameOrAddressOnly}
        breakLine={breakLine}
      />
      {!disableCopy && (
        <div
          css={({ color }) => ({ color: color.lightGrey, height: 16, cursor: 'pointer' })}
          onClick={() => copy(address.toSs58(chain), 'Address copied!')}
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

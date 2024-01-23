import { Identicon } from '@talismn/ui'
import { Chain } from '@domains/chains'
import { Address } from '@util/addresses'
import { NameAndAddress } from './NameAndAddress'
import { Check, Copy } from '@talismn/icons'
import AddressTooltip from '../AddressTooltip'
import useCopied from '@hooks/useCopied'

type Props = {
  chain?: Chain
  address: Address
  name?: string
  disableCopy?: boolean
  nameOrAddressOnly?: boolean
  withAddressTooltip?: boolean
  hideIdenticon?: boolean
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
  hideIdenticon = false,
}) => {
  const { copy, copied } = useCopied()

  const accountDetailsUI = (
    <div className="flex items-center gap-[8px] w-full overflow-hidden cursor-pointer">
      {!hideIdenticon && (
        <div css={{ minheight: identiconSize, minWidth: identiconSize }}>
          <Identicon size={identiconSize} value={address.toSs58(chain)} />
        </div>
      )}
      <NameAndAddress
        address={address}
        chain={chain}
        name={name}
        nameOrAddressOnly={nameOrAddressOnly}
        breakLine={breakLine}
      />
      {!disableCopy && (
        <div
          className="text-gray-200 h-[16px] cursor-pointer"
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
            copy(address.toSs58(chain), 'Address copied!')
          }}
        >
          {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
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

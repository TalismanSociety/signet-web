import { Chain } from '@domains/chains'
import { Address } from '@util/addresses'
import { X } from '@talismn/icons'
import { AccountDetails } from './AccountDetails'

export const SelectedAddress = ({
  address,
  chain,
  name,
  onClear,
}: {
  address: Address
  chain?: Chain
  name?: string
  onClear: () => void
}) => {
  return (
    <div
      className="absolute left-0 right-0 bottom-0 flex items-center justify-between w-full z-[10] h-[56px] px-[8px] group cursor-pointer"
      onClick={onClear}
    >
      <div className="p-[8px] rounded-[8px] bg-gray-900 overflow-hidden">
        <AccountDetails address={address} chain={chain} name={name} disableCopy withAddressTooltip />
      </div>
      <div className="group-hover:opacity-100 opacity-60">
        <X size={20} />
      </div>
    </div>
  )
}

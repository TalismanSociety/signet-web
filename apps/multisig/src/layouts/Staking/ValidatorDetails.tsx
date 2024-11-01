import AddressTooltip from '@components/AddressTooltip'
import { Chain } from '@domains/chains'
import { ValidatorWithIdentity } from '@domains/staking'
import { Identicon } from '@talismn/ui'
import { useMemo } from 'react'

type Props = {
  chain?: Chain
  disableTooltip?: boolean
  validator: ValidatorWithIdentity
}

export const ValidatorDetails: React.FC<Props> = ({ chain, disableTooltip, validator }) => {
  const fullName = useMemo(() => {
    if (validator.name && validator.subName) {
      return `${validator.name} / ${validator.subName}`
    }
    return validator.name
  }, [validator.name, validator.subName])

  return (
    <AddressTooltip address={validator.address} chain={chain} name={fullName} disabled={disableTooltip}>
      <div className="flex items-center gap-[8px] w-full overflow-hidden ">
        <Identicon size={32} className="min-w-[32px]" value={validator.address.toSs58()} />
        <div className="w-full overflow-hidden">
          <p className="text-[14px] font-semibold text-offWhite truncate">
            {validator.name ?? validator.address.toShortSs58(chain)}
            {validator.subName ? (
              <span className="font-normal text-[12px] text-gray-200"> /{validator.subName}</span>
            ) : (
              ''
            )}
          </p>
          {!!validator.name && (
            <p className="w-full text-[12px] whitespace-nowrap overflow-hidden text-ellipsis">
              {validator.address.toShortSs58(chain)}
            </p>
          )}
        </div>
      </div>
    </AddressTooltip>
  )
}

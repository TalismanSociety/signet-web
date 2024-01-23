import { useAzeroID } from '@domains/azeroid/AzeroIDResolver'
import { Chain } from '@domains/chains'
import { Address } from '@util/addresses'
import { useMemo } from 'react'

export const NameAndAddress: React.FC<{
  address: Address
  name?: string
  chain?: Chain
  nameOrAddressOnly?: boolean
  breakLine?: boolean
}> = ({ address, name, chain, nameOrAddressOnly, breakLine }) => {
  const { resolve } = useAzeroID()

  const azeroId = useMemo(() => {
    if (nameOrAddressOnly && name) return undefined
    return resolve(address.toSs58())?.a0id
  }, [address, name, nameOrAddressOnly, resolve])

  const primaryText = useMemo(() => {
    if (name) return name
    return azeroId ?? address.toShortSs58(chain)
  }, [address, azeroId, chain, name])

  const secondaryText = useMemo(() => {
    if (nameOrAddressOnly) return null
    if (name) return azeroId ?? address.toShortSs58(chain)
    return azeroId ? address.toShortSs58(chain) : null // address is primary text
  }, [address, azeroId, chain, name, nameOrAddressOnly])

  if (!secondaryText)
    return <p className="text-offWhite overflow-hidden text-ellipsis mt-[3px] w-full max-w-max">{primaryText}</p>

  return (
    <div
      css={{
        display: 'flex',
        gap: breakLine ? 4 : 8,
        flexDirection: breakLine ? 'column' : 'row',
        alignItems: breakLine ? 'flex-start' : 'center',
        marginTop: breakLine ? 0 : 2,
        overflow: 'hidden',
      }}
    >
      <p className="text-offWhite whitespace-nowrap overflow-hidden text-ellipsis max-w-max w-full leading-[1]">
        {primaryText}
      </p>
      {!!secondaryText && (
        <p className="text-gray-200 text-[12px] leading-[1] whitespace-nowrap overflow-hidden text-ellipsis max-w-max w-full">
          {secondaryText}
        </p>
      )}
    </div>
  )
}

import { Chain } from '@domains/chains'
import { Address } from '@util/addresses'
// import { ShortenAzeroId, isAzeroId } from '@util/azeroid'

export const NameAndAddress: React.FC<{
  address: Address
  name?: string
  a0Id?: string
  chain?: Chain
  nameA0IdAndAddress?: boolean
  nameOrAddressOnly?: boolean
  breakLine?: boolean
}> = ({ address, name, a0Id, chain, nameA0IdAndAddress, nameOrAddressOnly, breakLine }) => {
  const primaryValue = name ?? a0Id ?? address.toShortSs58(chain)
  const hasSecondaryValue = name || a0Id
  const secondaryValue = hasSecondaryValue ? (name ? a0Id : undefined) ?? address.toShortSs58(chain) : undefined

  if (!name && !a0Id)
    return <p css={({ color }) => ({ color: color.offWhite, marginTop: 6 })}>{address.toShortSs58(chain)}</p>

  return (
    <div
      css={{
        display: 'flex',
        gap: breakLine ? 0 : 8,
        flexDirection: breakLine ? 'column' : 'row',
        alignItems: breakLine ? 'flex-start' : 'center',
        marginTop: breakLine ? 0 : 4,
      }}
    >
      <p
        css={({ color }) => ({
          color: color.offWhite,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 140,
          width: '100%',
        })}
      >
        {primaryValue}
      </p>
      {!!secondaryValue && !nameOrAddressOnly && (
        <p css={({ color }) => ({ color: color.lightGrey, fontSize: 12 })}>{secondaryValue}</p>
      )}
      {nameA0IdAndAddress && name && a0Id && (
        <p css={({ color }) => ({ color: color.lightGrey, fontSize: 12 })}>{address.toShortSs58(chain)}</p>
      )}
    </div>
  )
}

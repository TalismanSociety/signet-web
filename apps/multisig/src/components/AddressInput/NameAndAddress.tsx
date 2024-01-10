import { Chain } from '@domains/chains'
import { Address } from '@util/addresses'
import { ShortedAzeroId } from '@util/azeroid'

export const NameAndAddress: React.FC<{
  address: Address
  name?: string
  a0Id?: string
  chain?: Chain
  a0IdAndAddress?: boolean
  nameOrAddressOnly?: boolean
  breakLine?: boolean
}> = ({ address, name, a0Id, chain, a0IdAndAddress, nameOrAddressOnly, breakLine }) => {
  const primaryValue = name ?? a0Id ?? address.toShortSs58(chain)
  const hasSecondaryValue = name || a0Id
  const secondaryValue = hasSecondaryValue ? (name ? a0Id : undefined) ?? address.toShortSs58(chain) : undefined

  if (!name && !a0Id)
    return <p css={({ color }) => ({ color: color.offWhite, marginTop: 6 })}>{address.toShortSs58(chain)}</p>

  if (a0Id && a0IdAndAddress) {
    if (name) {
      ;<p className="mt-[6px]">
        <span className="text-offWhite">{name}</span>
        {a0IdAndAddress ? <>&nbsp;{address.toShortSs58(chain)}</> : null}
      </p>
    }
    return (
      <p className="mt-[6px]">
        <span className="text-offWhite">{ShortedAzeroId(a0Id)}</span>
        {a0IdAndAddress ? <>&nbsp;{address.toShortSs58(chain)}</> : null}
      </p>
    )
  }

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
    </div>
  )
}

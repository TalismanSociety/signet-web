import { Chain } from '@domains/chains'
import { Address } from '@util/addresses'

export const NameAndAddress: React.FC<{
  address: Address
  name?: string
  a0Id?: string
  chain?: Chain
  a0IdAndAddress?: boolean
  nameOrAddressOnly?: boolean
  breakLine?: boolean
}> = ({ address, name, a0Id, chain, a0IdAndAddress, nameOrAddressOnly, breakLine }) => {
  if (!name && !a0Id)
    return <p css={({ color }) => ({ color: color.offWhite, marginTop: 6 })}>{address.toShortSs58(chain)}</p>

  if (a0Id)
    return (
      <p css={({ color }) => ({ color: color.offWhite, marginTop: 6 })}>
        {a0Id.toUpperCase()}
        {a0IdAndAddress ? `   ${address.toShortSs58(chain)}` : null}
      </p>
    )

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
          maxWidth: 120,
          width: '100%',
        })}
      >
        {name}
      </p>
      {!nameOrAddressOnly && (
        <p css={({ color }) => ({ color: color.lightGrey, fontSize: 12 })}>{address.toShortSs58(chain)}</p>
      )}
    </div>
  )
}

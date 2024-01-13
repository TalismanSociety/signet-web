import { Chain } from '@domains/chains'
import { Address } from '@util/addresses'
import { ShortenAzeroId, isAzeroId } from '@util/azeroid'

export const NameAndAddress: React.FC<{
  address: Address
  name?: string
  a0Id?: string
  chain?: Chain
  a0IdAndAddress?: boolean
  nameOrAddressOnly?: boolean
  breakLine?: boolean
  limitDisplayWidth?: boolean
}> = ({ address, name, a0Id, chain, a0IdAndAddress, nameOrAddressOnly, breakLine, limitDisplayWidth }) => {
  const primaryValue = name ?? a0Id ?? address.toShortSs58(chain)
  const hasSecondaryValue = name || a0Id
  const secondaryValue = hasSecondaryValue ? (name ? a0Id : undefined) ?? address.toShortSs58(chain) : undefined

  if (!name && !a0Id)
    return <p css={({ color }) => ({ color: color.offWhite, marginTop: 6 })}>{address.toShortSs58(chain)}</p>

  if (name && secondaryValue && isAzeroId(secondaryValue) && a0IdAndAddress) {
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
          {name}
        </p>
        {!!secondaryValue && !nameOrAddressOnly && (
          <div className={`${limitDisplayWidth ? 'w-60' : null}`}>
            <p className="overflow-auto" css={({ color }) => ({ color: color.lightGrey, fontSize: 12 })}>
              {a0Id ? ShortenAzeroId(a0Id) : null}
              <>&nbsp;&nbsp;{address.toShortSs58(chain)}</>
            </p>
          </div>
        )}
      </div>
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
      {name && secondaryValue && isAzeroId(secondaryValue) && (
        <p css={({ color }) => ({ color: color.lightGrey, fontSize: 12 })}>{}</p>
      )}
    </div>
  )
}

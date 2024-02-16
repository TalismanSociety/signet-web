import { useAzeroID } from '@domains/azeroid/AzeroIDResolver'
import { Chain } from '@domains/chains'
import { useOnchainIdentity } from '@domains/identity/useOnchainIdentity'
import { Address } from '@util/addresses'
import { useEffect, useMemo, useState } from 'react'

export const NameAndAddress: React.FC<{
  address: Address
  name?: string
  chain?: Chain
  nameOrAddressOnly?: boolean
  breakLine?: boolean
}> = ({ address, name, chain, nameOrAddressOnly, breakLine }) => {
  const { resolve } = useAzeroID()
  const [azeroId, setAzeroId] = useState<string | undefined>()
  const onchainIdentity = useOnchainIdentity(address, chain)

  useEffect(() => {
    if ((nameOrAddressOnly && name) || !!azeroId) return
    setAzeroId(resolve(address.toSs58())?.a0id)
  }, [address, azeroId, name, nameOrAddressOnly, resolve])

  const onchainIdentityUi = useMemo(() => {
    if (!onchainIdentity) return null
    return (
      <>
        {onchainIdentity.identity}{' '}
        {!!onchainIdentity.subIdentity && (
          <span className="text-gray-200 text-[12px]">/{onchainIdentity.subIdentity}</span>
        )}
      </>
    )
  }, [onchainIdentity])

  const primaryText = useMemo(
    () => name ?? onchainIdentityUi ?? azeroId ?? address.toShortSs58(chain),
    [address, azeroId, chain, name, onchainIdentityUi]
  )

  const secondaryText = useMemo(() => {
    if (nameOrAddressOnly) return null
    if (name) return onchainIdentityUi ?? azeroId ?? address.toShortSs58(chain)
    if (onchainIdentityUi) return azeroId ?? address.toShortSs58(chain)
    return null
  }, [address, azeroId, chain, name, nameOrAddressOnly, onchainIdentityUi])

  if (!secondaryText)
    return <p className="text-offWhite overflow-hidden text-ellipsis mt-[3px] w-full max-w-max">{primaryText}</p>

  return (
    <div
      css={{
        display: 'flex',
        gap: breakLine ? 4 : 8,
        flexDirection: breakLine ? 'column' : 'row',
        alignItems: breakLine ? 'flex-start' : 'center',
        overflowX: 'hidden',
      }}
    >
      <p className="text-offWhite whitespace-nowrap overflow-hidden text-ellipsis max-w-max w-full leading-[1] pt-[3px]">
        {primaryText}
      </p>
      {!!secondaryText && (
        <p className="text-gray-200 text-[12px] leading-[1] whitespace-nowrap overflow-hidden text-ellipsis max-w-max w-full pt-[3px]">
          {secondaryText}
        </p>
      )}
    </div>
  )
}

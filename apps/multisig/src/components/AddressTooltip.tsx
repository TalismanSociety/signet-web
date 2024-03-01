import { Check, Copy, ExternalLink } from '@talismn/icons'
import { Chain, filteredSupportedChains, useNativeTokenBalance, useSystemToken } from '../domains/chains'
import { Address } from '../util/addresses'
import { Tooltip } from './ui/tooltip'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '../util/tailwindcss'
import { useAzeroID } from '@domains/azeroid/AzeroIDResolver'
import { AzeroIDLogo } from './OtherLogos/AzeroID'
import { useSelectedMultisig } from '@domains/multisig'
import { useApi } from '@domains/chains/pjs-api'
import { formatUnits } from '@util/numbers'
import { Skeleton } from '@talismn/ui'
import useCopied from '@hooks/useCopied'
import { useOnchainIdentity } from '@domains/identity/useOnchainIdentity'

export const AddressTooltip: React.FC<
  React.PropsWithChildren & { address: Address | string; chain?: Chain; name?: string }
> = ({ children, address: _address, chain, name }) => {
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(chain?.genesisHash ?? selectedMultisig.chain.genesisHash)
  const token = useSystemToken(api)
  const { balanceBN } = useNativeTokenBalance(api, _address)
  const address = typeof _address === 'string' ? (Address.fromSs58(_address) as Address) : _address
  const ss58Address = address.toSs58(chain)
  const { copy, copied } = useCopied()
  const { resolve } = useAzeroID()
  const [a0Id, setA0Id] = useState<string>()
  const onchainIdentity = useOnchainIdentity(address, chain)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    copy(ss58Address, 'Address Copied!', <p className="text-[12px]">{address.toShortSs58(chain)}</p>)
  }

  useEffect(() => {
    if (!!a0Id) return
    setA0Id(resolve(address.toSs58())?.a0id)
  }, [a0Id, address, name, resolve])

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

  const defaultName = useMemo(() => {
    if (selectedMultisig.proxyAddress.isEqual(address)) return `${selectedMultisig.name} (Proxied)`
    if (selectedMultisig.multisigAddress.isEqual(address)) return `${selectedMultisig.name} (Multisig)`

    return onchainIdentityUi ?? a0Id ?? 'Unknown Address'
  }, [
    a0Id,
    address,
    onchainIdentityUi,
    selectedMultisig.multisigAddress,
    selectedMultisig.name,
    selectedMultisig.proxyAddress,
  ])

  return (
    <Tooltip
      content={
        <div className="p-3 cursor-default" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <div className="grid">
              <div className="flex items-center gap-[8px] mb-[2px]">
                <p className="text-gray-100 text-[14px] mt-2">{name ?? defaultName}</p>
                <a
                  className="cursor-pointer hover:text-offWhite"
                  onClick={handleCopy}
                  href={address.toSubscanUrl(chain ?? (filteredSupportedChains[0] as Chain))}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
            <div>
              {!!a0Id && (
                <a
                  className="flex items-center justify-center gap-[4px] hover:text-[#E7FE1B] text-gray-200 cursor-pointer"
                  href={`https://azero.id/id/${a0Id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <AzeroIDLogo height={14} width={14} />
                  <p className="text-[12px] mt-[2px]">{a0Id}</p>
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 p-3 bg-gray-700 border-gray-500 border rounded-[6px]">
            <p className="text-[12px] mt-2">{ss58Address}</p>
            <div className={cn(copied ? 'text-green-400' : 'cursor-pointer hover:text-offWhite')} onClick={handleCopy}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </div>
          </div>
          {!!token && !!token.tokenSymbol && !!token.tokenDecimals && (
            <p className="mt-[8px] text-[12px] text-left">
              Available Balance:{' '}
              {balanceBN !== undefined ? (
                <span className="text-offWhite">
                  {formatUnits(balanceBN, +token.tokenDecimals)} {token.tokenSymbol}
                </span>
              ) : (
                <Skeleton.Surface className="h-[12px] w-[80px]" />
              )}
            </p>
          )}
          {!!onchainIdentity && (
            <p className="text-[12px] mb-[2px] text-left">
              On-chain identity: <span className="text-offWhite">{onchainIdentityUi}</span>
            </p>
          )}
        </div>
      }
    >
      {children}
    </Tooltip>
  )
}

export default AddressTooltip

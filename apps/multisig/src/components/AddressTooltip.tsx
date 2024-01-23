import { Check, Copy, ExternalLink } from '@talismn/icons'
import { Chain, filteredSupportedChains } from '../domains/chains'
import { Address } from '../util/addresses'
import { Tooltip } from './ui/tooltip'
import { useToast } from './ui/use-toast'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '../util/tailwindcss'
import { useAzeroID } from '@domains/azeroid/AzeroIDResolver'
import { AzeroIDLogo } from './OtherLogos/AzeroID'
import { useSelectedMultisig } from '@domains/multisig'

export const AddressTooltip: React.FC<
  React.PropsWithChildren & { address: Address | string; chain?: Chain; name?: string }
> = ({ children, address: _address, chain, name }) => {
  const [selectedMultisig] = useSelectedMultisig()
  const address = typeof _address === 'string' ? (Address.fromSs58(_address) as Address) : _address
  const ss58Address = address.toSs58(chain)
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const { resolve } = useAzeroID()

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(ss58Address)
    if (copied) return
    setCopied(true)
    toast({
      title: 'Address copied!',
      description: <p className="text-[12px]">{address.toShortSs58(chain)}</p>,
    })
  }

  const a0Id = useMemo(() => resolve(address.toSs58())?.a0id, [address, resolve])

  const defaultName = useMemo(() => {
    if (selectedMultisig.proxyAddress.isEqual(address)) return `${selectedMultisig.name} (Proxied)`
    if (selectedMultisig.multisigAddress.isEqual(address)) return `${selectedMultisig.name} (Multisig)`

    return a0Id ?? 'Unknown Address'
  }, [a0Id, address, selectedMultisig.multisigAddress, selectedMultisig.name, selectedMultisig.proxyAddress])

  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false)
      }, 2_000)
    }
  }, [copied])

  return (
    <Tooltip
      content={
        <div className="p-3 cursor-default" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[8px] mb-2">
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
        </div>
      }
    >
      {children}
    </Tooltip>
  )
}

export default AddressTooltip

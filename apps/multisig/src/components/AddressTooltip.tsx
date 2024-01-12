import { Check, Copy, ExternalLink } from '@talismn/icons'
import { Chain, filteredSupportedChains } from '../domains/chains'
import { Address } from '../util/addresses'
import { Tooltip } from './ui/tooltip'
import { useToast } from './ui/use-toast'
import { useEffect, useState } from 'react'
import { cn } from '../util/tailwindcss'
import { toAzeroDomainUrl } from '@util/azeroid'

export const AddressTooltip: React.FC<
  React.PropsWithChildren & { address: Address | string; chain?: Chain; name?: string; a0Id?: string }
> = ({ children, address: _address, chain, name, a0Id }) => {
  const address = typeof _address === 'string' ? (Address.fromSs58(_address) as Address) : _address
  const ss58Address = chain ? address.toSs58(chain) : address.toSs58()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(ss58Address)
    if (copied) return
    setCopied(true)
    toast({
      title: 'Address copied!',
      description: <p className="text-[12px]">{chain ? address.toSs58(chain) : address.toSs58()}</p>,
    })
  }

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
          <div className="flex items-center gap-[8px] mb-2">
            <p className="text-gray-100 text-[14px] mt-2">{a0Id ?? name ?? 'Unknown Address'}</p>

            <a
              className="cursor-pointer hover:text-offWhite flex items-center"
              onClick={handleCopy}
              href={address.toSubscanUrl(chain ?? (filteredSupportedChains[0] as Chain))}
              target="_blank"
              rel="noreferrer"
            >
              <p className="text-gray-300 text-[14px] mt-2 px-2">{'Subscan'}</p>
              <ExternalLink size={16} />
            </a>
            {a0Id && (
              <a
                className="cursor-pointer hover:text-offWhite flex items-center"
                onClick={handleCopy}
                href={toAzeroDomainUrl(a0Id)}
                target="_blank"
                rel="noreferrer"
              >
                <p className="text-gray-300 text-[14px] mt-2 px-2">{'Azero'}</p>
                <ExternalLink size={16} />
              </a>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 p-3 bg-gray-500 rounded-[6px]">
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

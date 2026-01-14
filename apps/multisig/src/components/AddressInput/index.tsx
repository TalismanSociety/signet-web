import { Address } from '@util/addresses'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Chain } from '@domains/chains'
import { useOnClickOutside } from '@domains/common/useOnClickOutside'
import { SelectedAddress } from './SelectedAddressPill'
import { AccountDetails } from './AccountDetails'
import { Input } from '@components/ui/input'
import { useAzeroIDPromise } from '@domains/azeroid/AzeroIDResolver'
import { AlertTriangle } from '@talismn/icons'
import { useGetInfiniteAddresses } from '@domains/offchain-data/address-book/hooks/useGetInfiniteAddresses'
import { useDebounce } from '@hooks/useDebounce'
import { useKnownAddresses, KnownAddress } from '@hooks/useKnownAddresses'
import { cn } from '@util/tailwindcss'

type Props = {
  defaultAddress?: Address
  value?: string
  onChange: (address: Address | undefined, input: string) => void
  chain?: Chain
  hasError?: boolean
  shouldIncludeContacts?: boolean
  shouldIncludeSelectedMultisig?: boolean
  shouldExcludeExtensionContacts?: boolean
  leadingLabel?: string
  compact?: boolean
}

/**
 * Handles validating address input as well as displaying a list of addresses to select from.
 * Supports both controlled and uncontrolled usage input.
 */
const AddressInput = ({
  onChange,
  value,
  defaultAddress,
  chain,
  hasError = false,
  leadingLabel,
  compact,
  shouldIncludeContacts = false,
  shouldIncludeSelectedMultisig = false,
  shouldExcludeExtensionContacts = false,
}: Props) => {
  const [input, setInput] = useState(value ?? '')
  const [expanded, setExpanded] = useState(false)
  const [address, setAddress] = useState<Address | undefined>(
    defaultAddress ?? (value ? Address.fromSs58(value) || undefined : undefined)
  )
  const [contact, setContact] = useState<KnownAddress | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { resolve, resolving, data, clear } = useAzeroIDPromise()
  const { addresses: knownAddresses } = useKnownAddresses({
    includeSelectedMultisig: shouldIncludeSelectedMultisig,
    shouldExcludeExtensionContacts,
  })
  const debouncedQuery = useDebounce(input, 300)
  const {
    data: contacts,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useGetInfiniteAddresses({ search: debouncedQuery, isEnabled: shouldIncludeContacts })
  useOnClickOutside(containerRef.current, () => setExpanded(false))

  const handleQueryChange = useCallback(
    (addressString: string) => {
      const address = Address.fromSs58(addressString) || undefined
      setInput(addressString)
      setAddress(address)
      onChange(address, addressString)

      return address !== undefined
    },
    [onChange]
  )

  useEffect(() => {
    if (data?.address) {
      setAddress(data.address)
      handleQueryChange(data.address.toSs58(chain))
      setExpanded(false)
      clear()
    }
  }, [chain, clear, data, handleQueryChange])

  // filter client side addresses
  const filteredKnownAddresses = knownAddresses.filter(
    contact =>
      contact.address.toSs58().toLowerCase().includes(input.toLowerCase()) ||
      contact.name.toLowerCase().includes(input.toLowerCase())
  )

  // combine known addresses and contacts that have already been filtered by the search input query
  const combinedAddresses = shouldIncludeContacts ? [...filteredKnownAddresses, ...contacts] : filteredKnownAddresses

  const handleSelectFromList = useCallback(
    (address: Address, contact?: KnownAddress) => {
      if (hasError) return
      handleQueryChange(address.toSs58(chain))
      setAddress(address)
      setContact(contact)
      setExpanded(false)
    },
    [chain, handleQueryChange, hasError]
  )

  const handleClearInput = () => {
    inputRef.current?.focus()
    setExpanded(knownAddresses.length > 0 || shouldIncludeContacts)

    // clear states
    handleQueryChange('')
    setContact(undefined)
    setAddress(undefined)
  }

  const handleScroll = () => {
    if (!dropdownRef.current || !hasNextPage || isFetching || !shouldIncludeContacts) return
    const { scrollTop, scrollHeight, clientHeight } = dropdownRef.current
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      fetchNextPage()
    }
  }

  return (
    <div className="w-full relative" ref={containerRef}>
      {address && (
        <SelectedAddress
          address={address}
          chain={chain}
          name={contact?.name ?? combinedAddresses.find(t => t.address.isEqual(address))?.name}
          onClear={handleClearInput}
        />
      )}
      <Input
        ref={inputRef}
        label={leadingLabel}
        loading={resolving || isFetching}
        placeholder={address ? '' : combinedAddresses.length > 0 ? 'Search or paste address...' : 'Enter address...'}
        value={address ? '' : input}
        onChange={e => {
          resolve(e.target.value)
          const validInput = handleQueryChange(e.target.value)
          if (validInput || combinedAddresses.length > 0) {
            setExpanded(true)
          }
        }}
        onClick={() => {
          setExpanded(prev => {
            if (!prev) {
              return combinedAddresses.length > 0 || address !== undefined
            }
            return !prev
          })
        }}
        onClear={handleClearInput}
        showClearButton={!!address}
        hasError={hasError}
      />
      {hasError && (
        <div className="absolute flex items-center gap-2">
          <AlertTriangle size={12} className="text-red-400" />
          <div className="mt-[4px] text-red-400 text-[12px]">{`Invalid ${chain?.chainName} address`}</div>
        </div>
      )}
      <div
        className={`absolute top-full mt-2 left-0 w-full z-10 rounded-[8px] h-max overflow-hidden overflow-y-auto transition-all duration-200 ease-in-out bg-gray-800 shadow-lg ${
          expanded ? 'max-h-[150px]' : 'max-h-0'
        }`}
        ref={dropdownRef}
        onScroll={handleScroll}
      >
        <div className="py-[8px] px-0">
          {combinedAddresses.length > 0 ? (
            combinedAddresses.map((contact, index) => (
              <div
                key={index} // deliberate use of index as key. Using id or address will cause the UI to render stale data if the list has more than 1 page and the user searches for a new address
                onClick={() => handleSelectFromList(contact.address, contact)}
                className={cn(
                  'flex items-center justify-between py-[8px] px-[12px] cursor-pointer hover:brightness-125',
                  { 'cursor-not-allowed': hasError }
                )}
              >
                <AccountDetails
                  name={contact.name}
                  chain={chain}
                  address={contact.address}
                  disableCopy
                  breakLine={compact}
                  identiconSize={compact ? 32 : 24}
                  disabled={hasError}
                />
                <p className="whitespace-nowrap text-[14px] font-bold text-right text-gray-200">{contact.type}</p>
              </div>
            ))
          ) : address || (!isFetching && address) ? (
            // user pasted an unknown but valid address, show identicon and formatted address to indicate the address is valid
            <div
              className={cn('py-[8px] px-[12px] cursor-pointer hover:brightness-125', {
                'cursor-not-allowed': hasError,
              })}
              onClick={() => handleSelectFromList(address)}
            >
              <AccountDetails
                address={address}
                chain={chain}
                disableCopy
                breakLine={compact}
                identiconSize={compact ? 32 : 24}
                disabled={hasError}
              />
            </div>
          ) : (
            <p className="text-center p-[12px]">{isFetching ? 'Loading...' : 'No result found.'}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AddressInput

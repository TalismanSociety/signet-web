import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { Button } from '@components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@components/ui/popover'
import { Address } from '@util/addresses'
import { XIcon } from 'lucide-react'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useGetInfiniteAddresses } from '@domains/offchain-data/address-book/hooks/useGetInfiniteAddresses'
import { useDebounce } from '@hooks/useDebounce'
import { CircularProgressIndicator } from '@talismn/ui'
import { useKnownAddresses } from '@hooks/useKnownAddresses'

type Props = {
  inputRef: (node: HTMLInputElement | null) => void
  address?: Address
  onChangeAddress: (address?: Address) => void
  hasError?: boolean
} & React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>

export const AddressInputCell: React.FC<Props> = ({
  address,
  inputRef,
  onBlur,
  onChangeAddress,
  onFocus,
  hasError,
  ...inputProps
}) => {
  const [value, setValue] = useState('')
  const [focus, setFocus] = useState(false)
  const localRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(value, 300)
  const { addresses: knownAddresses } = useKnownAddresses()
  const {
    data: addressData,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useGetInfiniteAddresses({ search: debouncedQuery })

  const filteredContacts = useMemo(() => {
    const filteredKnownAddresses = knownAddresses.filter(
      contact =>
        contact.address.toSs58().toLowerCase().includes(value.toLowerCase()) ||
        contact.name.toLowerCase().includes(value.toLowerCase())
    )
    return [...filteredKnownAddresses, ...addressData]
  }, [addressData, knownAddresses, value])

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocus(true)
      onFocus?.(e)
    },
    [onFocus]
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocus(false)
      onBlur?.(e)
    },
    [onBlur]
  )

  const handleScroll = () => {
    if (!dropdownRef.current || !hasNextPage || isFetching) return
    const { scrollTop, scrollHeight, clientHeight } = dropdownRef.current
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      fetchNextPage()
    }
  }

  const selectedContactName = address ? filteredContacts?.find(contact => contact.address.isEqual(address))?.name : ''

  return (
    <div className="w-full flex items-center relative">
      <div className="w-full absolute left-0 flex items-center flex-1 gap-[8px]">
        {address && (
          <>
            <AccountDetails
              address={address}
              name={selectedContactName}
              nameOrAddressOnly
              withAddressTooltip={!hasError}
            />
            <Button
              size="icon"
              variant="secondary"
              className="w-[24px] h-[24px] min-w-[24px]"
              onClick={() => {
                onChangeAddress(undefined)
                setValue('')
              }}
            >
              <XIcon size={16} />
            </Button>
          </>
        )}
        {!selectedContactName && (address || value || focus) && isFetching && (
          <div className="ml-auto">
            <CircularProgressIndicator size={12} />
          </div>
        )}
      </div>

      <Popover open={focus}>
        <PopoverTrigger className="w-full">
          <input
            className="w-full"
            ref={ref => {
              inputRef(ref)
              // @ts-ignore
              localRef.current = ref
            }}
            {...inputProps}
            onFocus={handleFocus}
            onBlur={handleBlur}
            value={address ? '' : value}
            onChange={e => {
              setValue(e.target.value)
              try {
                const validAddress = Address.fromSs58(e.target.value)
                if (validAddress) {
                  onChangeAddress(validAddress)
                  localRef.current?.blur()
                }
              } catch {}
            }}
          />
        </PopoverTrigger>
        <PopoverContent
          className="w-max min-w-[240px] mt-[4px] bg-gray-900 border border-gray-700 max-h-[280px] overflow-y-auto"
          align="start"
          onOpenAutoFocus={e => {
            e.preventDefault()
          }}
          ref={dropdownRef}
          onScroll={handleScroll}
        >
          {filteredContacts?.map(contact => (
            <div
              key={contact.address.toSs58()}
              className="w-full p-[12px] hover:bg-gray-700 cursor-pointer"
              onClick={() => onChangeAddress(contact.address)}
            >
              <AccountDetails address={contact.address} name={contact.name} breakLine />
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  )
}

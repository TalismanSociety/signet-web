import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { Button } from '@components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@components/ui/popover'
import { Address } from '@util/addresses'
import { XIcon } from 'lucide-react'
import React, { useCallback, useMemo, useRef, useState } from 'react'

type Props = {
  inputRef: (node: HTMLInputElement | null) => void
  contacts?: { name: string; address: Address }[]
  address?: Address
  onChangeAddress: (address?: Address) => void
} & React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>

export const AddressInputCell: React.FC<Props> = ({
  address,
  contacts,
  inputRef,
  onBlur,
  onChangeAddress,
  onFocus,
  ...inputProps
}) => {
  const [value, setValue] = useState('')
  const [focus, setFocus] = useState(false)
  const localRef = useRef<HTMLInputElement>(null)

  const parsedAddress = useMemo(() => {
    try {
      return Address.fromSs58(value)
    } catch {
      return false
    }
  }, [value])

  const filteredContacts = useMemo(() => {
    if (!value) return contacts
    return contacts?.filter(contact => {
      if (
        contact.name.toLowerCase().includes(value.toLowerCase()) ||
        contact.address.toSs58().toLowerCase().includes(value.toLowerCase())
      )
        return true
      return parsedAddress && contact.address.isEqual(parsedAddress)
    })
  }, [contacts, parsedAddress, value])

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

  return (
    <div className="w-full relative">
      {address ? (
        <div className="w-full absolute top-0 left-0 flex items-center flex-1 gap-[8px]">
          <AccountDetails
            address={address}
            name={contacts?.find(contact => contact.address.isEqual(address))?.name}
            nameOrAddressOnly
            withAddressTooltip
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
        </div>
      ) : null}
      <Popover open={focus}>
        <PopoverTrigger>
          <input
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
        >
          {filteredContacts?.map(contact => (
            <div
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

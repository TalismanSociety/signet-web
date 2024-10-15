import { Multisig } from '@domains/multisig'
import { Address } from '@util/addresses'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { AddMemberInput } from '@components/AddMemberInput'
import toast from 'react-hot-toast'
import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { Button } from '@components/ui/button'
import { Trash } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '@util/tailwindcss'

type Props = {
  capHeight?: boolean
  editable?: boolean
  members: Address[]
  multisig: Multisig
  onChange?: (members: Address[]) => void
  error?: boolean
}

export const SignersSettings: React.FC<Props> = ({ capHeight, editable, error, members, multisig, onChange }) => {
  const membersAddresses = members.map(m => m.toSs58())
  const {
    addresses: knownAddresses,
    contactByAddress,
    isLoading,
  } = useKnownAddresses({ orgId: multisig.orgId, addresses: membersAddresses })
  const prevLength = useRef(members.length)
  const scrollView = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (members.length > prevLength.current) {
      scrollView.current?.scrollTo(0, scrollView.current?.scrollHeight)
    }
    prevLength.current = members.length
  }, [members.length])

  const handleRemove = (address: Address) => {
    const newMembers = members.filter(m => !m.isEqual(address))
    onChange?.(newMembers)
  }

  const handleAdd = (address: Address) => {
    if (members.some(m => m.isEqual(address))) return
    onChange?.([...members, address])
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <p className={cn('text-[14px] mt-[2px]', error ? 'text-red-500' : 'text-offWhite')}>Members</p>
      <div className={cn('grid gap-[8px]', capHeight ? ' max-h-[340px] overflow-y-auto' : '')} ref={scrollView}>
        {members.map(m => {
          const addressString = m.toSs58()
          const contact = contactByAddress[addressString]
          return (
            <div className="flex items-center gap-[8px] bg-gray-700 p-[12px] rounded-[12px]" key={addressString}>
              <AccountDetails
                address={m}
                name={contact?.name}
                breakLine
                disableCopy
                chain={multisig.chain}
                withAddressTooltip
                isNameLoading={isLoading}
              />
              <Button
                disabled={!editable}
                size="icon"
                variant="ghost"
                onClick={members.length > 1 ? () => handleRemove(m) : undefined}
              >
                <Trash size={16} />
              </Button>
            </div>
          )
        })}
      </div>
      {editable && (
        <AddMemberInput
          compactInput
          onNewAddress={handleAdd}
          validateAddress={address => {
            const conflict = members.some(a => a.isEqual(address))
            if (conflict) toast.error('Duplicate address')
            return !conflict
          }}
          addresses={knownAddresses}
        />
      )}
    </div>
  )
}

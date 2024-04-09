import { useUser } from '@domains/auth'

import { AccountDetails } from '../AddressInput/AccountDetails'
import { useSelectedMultisig } from '@domains/multisig'
import { Button } from '../ui/button'
import { ChevronVertical } from '@talismn/icons'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { useSignOut } from '@domains/auth/AccountWatcher'
import { useState } from 'react'
import { AccountsList } from './AccountsList'
import { CustomRPC } from './CustomRPC'

export const AccountMenu: React.FC = () => {
  const { user } = useUser()
  const [multisig] = useSelectedMultisig()
  const signOut = useSignOut()
  const [showAccounts, setShowAccounts] = useState(false)
  const [showCustomRpcs, setShowCustomRpcs] = useState(false)

  if (!user) return null

  return (
    <Popover
      onOpenChange={open => {
        if (!open) {
          setShowAccounts(false)
          setShowCustomRpcs(false)
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="secondary" className="px-[12px] gap-[8px] bg-gray-900 hover:bg-gray-800 max-w-[240px]">
          <AccountDetails
            identiconSize={32}
            address={user.injected.address}
            name={user.injected.meta.name}
            chain={multisig.chain}
            breakLine
            disableCopy
            withAddressTooltip
          />
          <ChevronVertical />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="bg-gray-900 border border-gray-700 w-[240px] p-[4px]">
        {showAccounts ? (
          <AccountsList onBack={() => setShowAccounts(false)} />
        ) : showCustomRpcs ? (
          <CustomRPC onBack={() => setShowCustomRpcs(false)} />
        ) : (
          <div>
            <Button
              variant="ghost"
              size="lg"
              className="w-full text-start justify-start px-[12px] py-[8px] h-max min-h-max rounded-[8px]"
              onClick={() => setShowAccounts(true)}
            >
              Switch Account
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full text-start justify-start px-[12px] py-[8px] h-max min-h-max rounded-[8px]"
              onClick={() => setShowCustomRpcs(true)}
            >
              Use Custom RPC
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full text-start justify-start text-red-400 hover:text-red-300 px-[12px] py-[8px] h-max min-h-max rounded-[8px]"
              onClick={() => signOut(user.injected.address.toSs58())}
            >
              Sign Out
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default AccountMenu

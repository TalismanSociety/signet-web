import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { useToast } from '@components/ui/use-toast'
import { useSignIn, useUser } from '@domains/auth'
import { accountsState, InjectedAccount } from '@domains/extension'
import { ChevronLeft } from '@talismn/icons'
import { CircularProgressIndicator, Identicon } from '@talismn/ui'
import { Address } from '@util/addresses'
import { useCallback, useMemo, useRef, useState } from 'react'
import { atom, useRecoilValue } from 'recoil'

export const blockAccountSwitcher = atom<boolean>({
  key: 'blockAccountSwitcher',
  default: false,
})

export const AccountsList: React.FC<{ onBack?: () => void; hideHeader?: boolean; onlyEthAccounts?: boolean }> = ({
  onBack,
  hideHeader = false,
  onlyEthAccounts,
}) => {
  const accounts = useRecoilValue(accountsState)
  const [query, setQuery] = useState('')
  const { user } = useUser()
  const [accountToSignIn, setAccountToSignIn] = useState<InjectedAccount>()
  const { signIn } = useSignIn()
  const blocked = useRecoilValue(blockAccountSwitcher)
  const { toast, dismiss } = useToast()
  const toastId = useRef<string>()

  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const isSelectedAccount = user?.injected?.address.isEqual(acc.address)
      // If no filter is applied, show all accounts, otherwise filter by onlyEthAccounts
      const shouldFilterAccount =
        onlyEthAccounts !== undefined ? (onlyEthAccounts ? acc.address.isEthereum : !acc.address.isEthereum) : true

      let queryAddress: Address | false = false
      try {
        queryAddress = Address.fromSs58(query)
      } catch (e) {}

      // query by pasting address
      if (queryAddress) return !isSelectedAccount && queryAddress.isEqual(acc.address)

      const isQueryMatch =
        !query || `${acc.meta.name} ${acc.address.toSs58()}`.toLowerCase().includes(query.toLowerCase())
      return !isSelectedAccount && isQueryMatch && shouldFilterAccount
    })
  }, [accounts, user?.injected?.address, onlyEthAccounts, query])

  const selectAccount = useCallback(
    async (account: InjectedAccount) => {
      if (blocked) {
        if (toastId.current) dismiss(toastId.current)
        const { id } = toast({
          title: 'Cannot switch accounts.',
          description: "Make sure you're not in the middle of something.",
        })
        toastId.current = id
        return
      }
      setAccountToSignIn(account)
      try {
        await signIn(account)
      } finally {
        setAccountToSignIn(undefined)
      }
    },
    [blocked, dismiss, signIn, toast]
  )

  if (accountToSignIn) {
    return (
      <div className="flex flex-col gap-[4px] h-[210px] items-center justify-center bg-gray-700 rounded-[8px]">
        <div className="flex items-center gap-[8px] mb-[24px]">
          <CircularProgressIndicator />
          <p className="text-offWhite font-bold">Signing In</p>
        </div>
        <Identicon size={40} value={accountToSignIn.address.toSs58()} />
        <p className="text-offWhite mt-[8px] text-center whitespace-nowrap text-ellipsis w-full overflow-hidden">
          {accountToSignIn.meta.name}
        </p>
        <p className="text-[12px] text-gray-200">{accountToSignIn.address.toShortSs58()}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[12px] h-[210px] flex-1">
      {!hideHeader && (
        <div className="flex items-center justify-between ">
          <Button size="icon" className="items-center" variant="ghost" onClick={onBack}>
            <ChevronLeft size={14} />
          </Button>
          <h4 className="text-[14px] font-semibold mt-[3px]">Switch Account</h4>
          <div className="w-[30px]" />
        </div>
      )}
      <Input
        placeholder="Search by name or address..."
        className="text-[14px] px-[12px] py-[9px] rounded-[8px]"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="flex flex-col flex-1 items-start justify-start overflow-y-auto bg-gray-800 gap-[8px] p-[8px] rounded-[8px]">
        {filteredAccounts.map(acc => (
          <Button
            variant="ghost"
            size="lg"
            className="h-max w-full py-[8px] bg-gray-700"
            key={acc.address.toSs58()}
            onClick={() => selectAccount(acc)}
          >
            <AccountDetails disableCopy address={acc.address} name={acc.meta.name} breakLine />
          </Button>
        ))}
      </div>
    </div>
  )
}

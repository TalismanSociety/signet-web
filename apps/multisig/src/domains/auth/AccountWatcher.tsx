import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { authTokenBookState, selectedAddressState } from '.'
import { accountsState, extensionAllowedState, extensionInitiatedState } from '../extension'
import { useCallback, useEffect } from 'react'
import jwt from 'jsonwebtoken'

const isJwtValid = (jwtToken: string) => {
  const decoded = jwt.decode(jwtToken)
  if (typeof decoded === 'string') return false

  const expiry = decoded?.exp
  if (!expiry) return false
  return expiry * 1000 > Date.now()
}

export const useSignOut = () => {
  const [authTokenBook, setAuthTokenBook] = useRecoilState(authTokenBookState)
  const extensionAccounts = useRecoilValue(accountsState)
  const setSelectedAccount = useSetRecoilState(selectedAddressState)

  const findNextSignedInAccount = useCallback(
    (exclude?: string) =>
      extensionAccounts.find(account => {
        const address = account.address.toSs58()
        const auth = authTokenBook[address]
        if (!auth || typeof auth === 'string') return false
        return address !== exclude && isJwtValid(auth.accessToken) && auth.id
      }),
    [authTokenBook, extensionAccounts]
  )

  return useCallback(
    (accountAddress: string) => {
      setAuthTokenBook({ ...authTokenBook, [accountAddress]: undefined })
      const nextAccount = findNextSignedInAccount(accountAddress)
      if (nextAccount) setSelectedAccount(nextAccount.address.toSs58())
    },
    [authTokenBook, findNextSignedInAccount, setAuthTokenBook, setSelectedAccount]
  )
}

export const AccountWatcher: React.FC = () => {
  const [authTokenBook, setAuthTokenBook] = useRecoilState(authTokenBookState)
  const [selectedAccount, setSelectedAccount] = useRecoilState(selectedAddressState)
  const extensionInitiated = useRecoilValue(extensionInitiatedState)

  const extensionAllowed = useRecoilValue(extensionAllowedState)
  const extensionAccounts = useRecoilValue(accountsState)

  const findNextSignedInAccount = useCallback(
    (exclude?: string) =>
      extensionAccounts.find(account => {
        const address = account.address.toSs58()
        const auth = authTokenBook[address]
        if (!auth || typeof auth === 'string') return false
        return address !== exclude && !!auth && isJwtValid(auth.accessToken) && auth.id
      }),
    [authTokenBook, extensionAccounts]
  )

  useEffect(() => {
    // user disabled all accounts, clean up all jwt token
    if (!extensionAllowed) {
      setSelectedAccount(null)
      if (Object.keys(authTokenBook).length > 0) setAuthTokenBook({})
      return
    }

    // clean up JWT token if user removed account from extension
    // since extensionAllowed is true, if extensionAccounts list is empty,
    // we're in the process of connecting wallet and should not do any clean up yet
    if (extensionInitiated && extensionAccounts.length > 0) {
      Object.entries(authTokenBook).forEach(([address, auth]) => {
        const account = extensionAccounts.find(account => account.address.toSs58() === address)
        if ((auth && !account) || (auth && (typeof auth === 'string' || !isJwtValid(auth.accessToken) || !auth.id))) {
          console.log('here')
          setAuthTokenBook({ ...authTokenBook, [address]: undefined })
          if (selectedAccount === address) setSelectedAccount(null)
        }
      })
    }

    // auto select first signed in account if none
    if (!selectedAccount) {
      // auto select first signed in account if none
      const signedInAccount = findNextSignedInAccount()
      if (!signedInAccount) return
      setSelectedAccount(signedInAccount.address.toSs58())
    }
  }, [
    authTokenBook,
    extensionAccounts,
    extensionAllowed,
    extensionInitiated,
    findNextSignedInAccount,
    selectedAccount,
    setAuthTokenBook,
    setSelectedAccount,
  ])

  return null
}

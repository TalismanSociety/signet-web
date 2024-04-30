import { useQuery } from '@apollo/client'
import { gql } from 'graphql-tag'
import { useEffect, useMemo } from 'react'
import { useSignOut } from './AccountWatcher'
import { useRecoilValue } from 'recoil'
import { selectedAccountState } from '.'

type MeOutput = {
  me: {
    error?: string
    user?: {
      id: string
      identifier: string
      identifierType: string
      whitelisted: boolean
    }
  }
}

const ME_QUERY = gql`
  {
    me {
      error
      user {
        id
        identifier
        identifierType
        whitelisted
      }
    }
  }
`

export const useMe = () => {
  const selectedAccount = useRecoilValue(selectedAccountState)
  const {
    data,
    error: gqlError,
    loading,
  } = useQuery<MeOutput>(ME_QUERY, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  })
  const signOut = useSignOut()

  const user = useMemo(() => data?.me.user, [data])
  const error = useMemo(() => {
    return data?.me?.error ?? gqlError?.message
  }, [data?.me?.error, gqlError?.message])

  // sign out user if token expired
  useEffect(() => {
    if (error?.includes('JWTExpired') && selectedAccount) {
      console.log(`JWT expired for ${selectedAccount.injected.address.toSs58()}, signing out...`)
      signOut(selectedAccount.injected.address.toSs58())
    }
  }, [error, selectedAccount, signOut])

  return { user, loading, error }
}

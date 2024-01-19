import { useQuery } from '@apollo/client'
import { gql } from 'graphql-tag'
import { useMemo } from 'react'

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
  const {
    data,
    error: gqlError,
    loading,
  } = useQuery<MeOutput>(ME_QUERY, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  })

  const user = useMemo(() => data?.me.user, [data])
  const error = useMemo(() => {
    return data?.me?.error ?? gqlError?.message
  }, [data?.me?.error, gqlError?.message])

  return { user, loading, error }
}

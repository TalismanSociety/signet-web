import { captureException } from '@sentry/react'
import { SignedInAccount, selectedAccountState } from '../auth'
import { RequestDocument, Variables, request } from 'graphql-request'
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink, useQuery } from '@apollo/client'
import { atom, useRecoilValue, useSetRecoilState } from 'recoil'
import { setContext } from '@apollo/client/link/context'
import { useEffect, useMemo } from 'react'

const HASURA_ENDPOINT = process.env.REACT_APP_HASURA_ENDPOINT ?? ''

type Response<TData = any> = {
  data?: TData
  error?: any
}

export const requestSignetBackend = async <TData = any, TVariables extends Variables = any>(
  query: string | RequestDocument,
  variables?: TVariables,
  signer?: SignedInAccount
): Promise<Response<TData>> => {
  const headers = new Headers()
  if (signer?.jwtToken) headers.append('Authorization', `Bearer ${signer.jwtToken}`)

  try {
    const data = await request<TData>(`${HASURA_ENDPOINT}/v1/graphql`, query, variables, headers)
    return { data }
  } catch (error) {
    captureException(error, {
      extra: {
        hasuraEndpoint: HASURA_ENDPOINT,
        query,
        variables,
        signer,
        hasJwtToken: signer?.jwtToken !== undefined,
      },
    })
    return { error }
  }
}

const hasuraClient = atom({
  key: 'hasuraClient',
  default: new ApolloClient({
    cache: new InMemoryCache(),
    link: createHttpLink({
      uri: `${HASURA_ENDPOINT}/v1/graphql`,
    }),
  }),
  dangerouslyAllowMutability: true,
})

export const HasuraProvider = ({ children }: { children: React.ReactNode }) => {
  const setHasuraClient = useSetRecoilState(hasuraClient)
  const signedInAccount = useRecoilValue(selectedAccountState)
  const cache = useMemo(() => new InMemoryCache(), [])

  const authLink = useMemo(
    () =>
      setContext((_, { headers }) => {
        if (!signedInAccount) return { headers }
        return {
          headers: {
            ...headers,
            Authorization: `Bearer ${signedInAccount.jwtToken}`,
          },
        }
      }),
    [signedInAccount]
  )

  const httpLink = useMemo(
    () =>
      createHttpLink({
        uri: `${HASURA_ENDPOINT}/v1/graphql`,
      }),
    []
  )

  const client = useMemo(
    () =>
      new ApolloClient({
        cache,
        link: authLink.concat(httpLink),
      }),
    [authLink, cache, httpLink]
  )

  useEffect(() => {
    setHasuraClient(client)
  }, [client, setHasuraClient])

  return <ApolloProvider client={client}>{children}</ApolloProvider>
}

export const useHasura: typeof useQuery = (...params) => {
  const client = useRecoilValue(hasuraClient)
  const signedInUser = useRecoilValue(selectedAccountState)

  return useQuery(params[0], {
    ...params[1],
    // client should never be overwritten
    client,
    // skip can be overwritten when client exists
    skip: !client ? true : params[1]?.skip ?? !signedInUser,
  })
}

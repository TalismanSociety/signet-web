import { useCallback, useMemo, useState } from 'react'
import { atom, selector, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { web3FromSource } from '@polkadot/extension-dapp'
import { SiwsMessage } from '@talismn/siws'
import { InjectedAccount, accountsState } from '../extension'
import persistAtom from '../persist'
import { captureException } from '@sentry/react'
import { useSelectedMultisig } from '@domains/multisig'
import { useToast } from '@components/ui/use-toast'
import { useAzeroID } from '@domains/azeroid/AzeroIDResolver'
import { CONFIG } from '@lib/config'

const SIWS_ENDPOINT = process.env.REACT_APP_SIWS_ENDPOINT ?? ''

// keyed by ss58 address, value is the auth token
type AuthTokenBook = Record<string, string | { accessToken: string; id: string } | undefined>

export type SignedInAccount = {
  jwtToken: string
  injected: InjectedAccount
  id: string
}

// store selected address in local storage
// then derive the JWT and injected account
export const selectedAddressState = atom<string | null>({
  key: 'SelectedAddress',
  default: null,
  effects_UNSTABLE: [persistAtom],
})

export const authTokenBookState = atom<AuthTokenBook>({
  key: 'AuthTokenBook',
  default: {},
  effects_UNSTABLE: [persistAtom],
})

// an account can only be selected if:
// - user has explicitly selected the address
// - jwt is stored in auth book
// - account is connected from extension
export const selectedAccountState = selector<SignedInAccount | null>({
  key: 'SelectedAccount',
  get: ({ get }) => {
    const selectedAddress = get(selectedAddressState)
    const authTokenBook = get(authTokenBookState)
    const extensionAccounts = get(accountsState)

    // account not explicitly selected
    if (!selectedAddress) return null

    // account not signed in, hence cannot be selected
    const auth = authTokenBook[selectedAddress]
    if (auth === undefined) return null

    // account not connected from extension
    const injected = extensionAccounts.find(account => account.address.toSs58() === selectedAddress)
    if (!injected) return null

    // backward compatibility: auth token used to be a string
    if (typeof auth === 'string') return null
    return { jwtToken: auth.accessToken, injected, id: auth.id }
  },
})

export const signedInAccountState = atom<string | null>({
  key: 'SignedInAccount',
  default: null,
})

export const useSignIn = () => {
  const { resolve } = useAzeroID()
  const [authTokenBook, setAuthTokenBook] = useRecoilState(authTokenBookState)
  const setSelectedAccount = useSetRecoilState(selectedAddressState)
  const [signingIn, setSigningIn] = useState(false)
  const { toast, dismiss } = useToast()

  const signIn = useCallback(
    async (account: InjectedAccount) => {
      if (signingIn) return
      setSigningIn(true)

      const ss58Address = account.address.toSs58()
      let auth = authTokenBook[ss58Address]
      try {
        if (typeof auth === 'string' || !auth?.accessToken || !auth.id) {
          // to be able to retrieve the signer interface from this account
          // we can use web3FromSource which will return an InjectedExtension type
          const injector = await web3FromSource(account.meta.source)

          if (!injector.signer.signRaw) throw new Error('Wallet does not support signing message.')

          // generate nonce from server
          const res = await fetch(`${SIWS_ENDPOINT}/nonce`, {
            method: 'post',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
          const nonceData = await res.json()

          // error string captured by Hasura (e.g. invalid hasura query)
          if (nonceData.error) throw new Error(nonceData.error)

          const nonce = nonceData?.nonce

          // should've been captured by `nonceData.error`, but adding this check just to be sure
          if (!nonce) throw new Error('Failed to request for nonce.')

          // construct siws message
          const siws = new SiwsMessage({
            address: ss58Address,
            domain: 'signet.talisman.xyz',
            nonce,
            uri: window.location.origin,
            statement: `Welcome to ${CONFIG.APP_NAME}! Please sign in to continue.`,
            chainName: 'Substrate',
            azeroId: resolve(ss58Address)?.a0id,
          })

          // sign payload for backend verification
          const signed = await siws.sign(injector)

          // exchange JWT token from server
          const verifyRes = await fetch(`${SIWS_ENDPOINT}/verify`, {
            method: 'post',
            body: JSON.stringify({ ...signed, address: ss58Address }),
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          })

          const verifyData = await verifyRes.json()

          if (verifyData.error) throw new Error(verifyData.error)
          if (verifyData && verifyData.accessToken && verifyData.id) {
            auth = {
              accessToken: verifyData?.accessToken,
              id: verifyData?.id,
            }
          }
        }

        if (auth) {
          dismiss()
          setSelectedAccount(ss58Address)
          setAuthTokenBook({
            ...authTokenBook,
            [ss58Address]: auth,
          })
        } else {
          throw new Error('Please try again.')
        }
      } catch (e) {
        console.error(e)
        captureException(e, { extra: { siwsEndpoint: SIWS_ENDPOINT } })
        toast({
          title: 'Failed to sign in.',
          description: typeof e === 'string' ? e : (e as any).message ?? 'Please try again.',
        })
      } finally {
        setSigningIn(false)
      }
    },
    [authTokenBook, dismiss, resolve, setAuthTokenBook, setSelectedAccount, signingIn, toast]
  )

  return { signIn, signingIn }
}

export { AccountWatcher } from './AccountWatcher'

export const useUser = () => {
  const [multisig] = useSelectedMultisig()
  const user = useRecoilValue(selectedAccountState)
  const isCollaborator = useMemo(() => (user ? multisig.isCollaborator(user.injected.address) : true), [multisig, user])
  const isSigner = useMemo(() => (user ? multisig.isSigner(user.injected.address) : true), [multisig, user])
  return { user, isSigner, isCollaborator }
}

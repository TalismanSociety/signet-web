import { BaseToken, supportedChains } from '@domains/chains'
import { aggregatedMultisigsState, selectedMultisigState } from '@domains/multisig'
import { Balance, Balances } from '@talismn/balances'
import { useBalances, useSetBalancesAddresses } from '@talismn/balances-react'
import { useUser } from '@domains/auth'
import { useEffect, useMemo } from 'react'
import { atom, useRecoilValue, useSetRecoilState } from 'recoil'
import { Address } from '../../util/addresses'

export const balancesState = atom<Balances | undefined>({
  key: 'Balances',
  default: undefined,
  dangerouslyAllowMutability: true,
})

/** @deprecated use balances library directly*/
export interface TokenAugmented {
  id: string
  details: BaseToken
  balance: {
    avaliable: number
    unavaliable: number
  }
  balanceDetails: Balance
  price: number
}

export const useAugmentedBalances = () => {
  const balances = useRecoilValue(balancesState)
  const { user } = useUser()

  const multisigBalances = !user
    ? balances
    : balances?.find(({ address }) => {
        const parsedAddress = Address.fromSs58(address)
        return parsedAddress && !parsedAddress.isEqual(user.injected.address)
      })

  return useMemo(() => {
    if (!multisigBalances) return undefined
    return multisigBalances.filterNonZeroFiat('total', 'usd').sorted.reduce((acc: TokenAugmented[], b) => {
      if (b.chain === null || !b.token) return acc
      const balanceChain = b.chain

      if (
        b.token.type !== 'substrate-native' &&
        b.token.type !== 'substrate-assets' &&
        b.token.type !== 'substrate-tokens'
      ) {
        console.error('token has unrecognised type, skipping', b.token)
        return acc
      }

      const chain = supportedChains.find(c => c.id === balanceChain.id)
      if (!chain) return acc

      const avaliable = parseFloat(b.transferable.tokens)
      const unavaliable = parseFloat(b.total.tokens) - avaliable
      const token: BaseToken = {
        id: b.tokenId,
        chain,
        symbol: b.token.symbol,
        coingeckoId: b.token.coingeckoId,
        decimals: b.token.decimals,
        logo: b.token.logo,
        type: b.token.type,
      }
      return [
        ...acc,
        { details: token, balance: { avaliable, unavaliable }, price: b.rates?.usd || 0, id: b.id, balanceDetails: b },
      ]
    }, [])
  }, [multisigBalances])
}

export const BalancesWatcher = () => {
  const multisigs = useRecoilValue(aggregatedMultisigsState)
  const selectedMultisig = useRecoilValue(selectedMultisigState)
  const setBalances = useSetRecoilState(balancesState)
  const { user } = useUser()
  const multisigAddresses = useMemo(() => multisigs.map(({ proxyAddress }) => proxyAddress), [multisigs])

  // clean up for loading state
  useEffect(() => {
    setBalances(undefined)
  }, [multisigs, setBalances])

  useSetBalancesAddresses(
    useMemo(
      () => multisigAddresses.concat(user ? [user.injected.address] : []).map(a => a.toSs58(selectedMultisig.chain)),
      [multisigAddresses, selectedMultisig.chain, user]
    )
  )

  const balances = useBalances()
  useEffect(() => {
    setBalances(balances.filterNonZeroFiat('total', 'usd'))
  }, [balances, setBalances])

  return null
}

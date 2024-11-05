import { pjsApiSelector } from '@domains/chains/pjs-api'
import { ComputedSubstrateBalance, computeSubstrateBalance } from '@util/balances'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRecoilValueLoadable } from 'recoil'

export type UseSubstrateBalanceProps = {
  genesisHash: string
  address: string
}

type SubstrateBalance = ComputedSubstrateBalance

export const useSubstrateBalance = (props: UseSubstrateBalanceProps) => {
  const [balance, setBalance] = useState<SubstrateBalance | undefined>()
  const unsubRef = useRef<() => void>()
  const api = useRecoilValueLoadable(pjsApiSelector(props.genesisHash))
  const initiated = useRef(false)

  const fetchBalance = useCallback(() => {
    if (!props || unsubRef.current || initiated.current) return

    if (api.state === 'hasValue') {
      initiated.current = true
      api.contents.query.system
        .account(props.address, account => {
          setBalance(computeSubstrateBalance(api.contents, account))
        })
        .then(unsub => {
          unsubRef.current = unsub
        })
    }
  }, [props, api.state, api.contents])

  useEffect(() => {
    if (!props && balance !== undefined) setBalance(undefined)
  }, [balance, props])

  useEffect(() => {
    setBalance(undefined)
    initiated.current = false
  }, [props.address, props.genesisHash])

  useEffect(() => {
    fetchBalance()
    return () => {
      if (unsubRef.current) {
        unsubRef.current?.()
        unsubRef.current = undefined
      }
    }
  }, [fetchBalance])

  return balance
}

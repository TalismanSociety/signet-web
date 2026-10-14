import { useEffect, useState } from 'react'
import { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'
import { Address } from '@util/addresses'

export type ProxyDepositRequirement = {
  /** amount the proxied account must have free to reserve the deposit for one extra proxy */
  required: BN
  /** current free balance of the proxied account */
  free: BN
  /** deposit currently reserved for the proxied account's proxies */
  currentDeposit: BN
  proxiesCount: number
  sufficient: boolean
}

/**
 * Adding a proxy to a proxied account reserves a deposit on the proxied account itself:
 * new deposit = base + factor * (n + 1), reserve = new deposit - currently reserved deposit.
 * If the proxied account doesn't have that much free balance, `proxy.addProxy` fails with
 * `balances.InsufficientBalance` inside `proxy.proxy`, which does NOT fail the outer extrinsic.
 */
export const useProxyDepositRequirement = (api: ApiPromise | undefined, proxiedAddress: Address | undefined) => {
  const [requirement, setRequirement] = useState<ProxyDepositRequirement>()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!api || !proxiedAddress) return
    if (!api.query.proxy?.proxies || !api.consts.proxy) {
      console.warn('[useProxyDepositRequirement] chain missing proxy pallet')
      return
    }

    let cancelled = false
    setLoading(true)
    Promise.all([api.query.proxy.proxies(proxiedAddress.bytes), api.query.system.account(proxiedAddress.bytes)])
      .then(([proxiesRes, account]) => {
        if (cancelled) return
        const [defs, deposit] = proxiesRes as unknown as [{ length: number }, { toString(): string }]
        const base = new BN(api.consts.proxy.proxyDepositBase.toString())
        const factor = new BN(api.consts.proxy.proxyDepositFactor.toString())
        const currentDeposit = new BN(deposit.toString())
        const proxiesCount = defs.length
        const newDeposit = base.add(factor.muln(proxiesCount + 1))
        const required = BN.max(newDeposit.sub(currentDeposit), new BN(0))
        const free = new BN(account.data.free.toString())
        setRequirement({ required, free, currentDeposit, proxiesCount, sufficient: free.gte(required) })
      })
      .catch(e => console.error('[useProxyDepositRequirement] failed to fetch proxy deposit requirement', e))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [api, proxiedAddress])

  return { requirement, loading }
}

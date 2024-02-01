import { DispatchError } from '@polkadot/types/interfaces'
import type { SubmittableResult } from '@polkadot/api'

const handleTokenError = (tokenError: any) => {
  switch (tokenError.type) {
    case 'FundsUnavailable':
      return 'Funds unavailable. Make sure you have enough balance.'
    default:
      return tokenError.type
  }
}

const handleDispatchError = (error: DispatchError) => {
  if (error.isModule) return error.asModule.registry.findMetaError(error.asModule)
  return null
}

export const handleSubmittableResultError = (res: SubmittableResult) => {
  // if we get a dispatch error, return immediately to unsubscribe to result
  if (res.dispatchError) {
    const registryError = handleDispatchError(res.dispatchError)
    if (registryError) {
      console.error(registryError)
      throw new Error(registryError.docs.join(''))
    }
    if (res.dispatchError.isToken) {
      const tokenError = handleTokenError(res.dispatchError.asToken)
      if (tokenError) {
        console.error(tokenError)
        throw new Error(tokenError)
      }
    }
  }

  if (res.isError) {
    console.error(res.toHuman())
    throw new Error(JSON.stringify(res.toHuman()))
  }

  // we wait for tx to be finalized before we check for error
  if (!res.status.isFinalized) return

  // tx is finalized and most errors should've been captured by dispatch error, find any system error
  const errorEvent = res.events.find(({ event }) => event.section === 'system' && event.method === 'ExtrinsicFailed')
  if (errorEvent) {
    console.error(errorEvent.toHuman())
    throw new Error(JSON.stringify(errorEvent.toHuman()))
  }
}

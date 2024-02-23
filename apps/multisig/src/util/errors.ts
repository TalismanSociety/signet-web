import { DispatchError } from '@polkadot/types/interfaces'
import type { SubmittableResult } from '@polkadot/api'
import { FrameSystemEventRecord } from '@polkadot/types/lookup'
import { Result } from '@polkadot/types'

const handleTokenError = (tokenError: any) => {
  switch (tokenError.type) {
    case 'FundsUnavailable':
      return 'Funds are unavailable.'
    case 'OnlyProvider':
      return 'Account that must exist would die'
    case 'BelowMinimum':
      return 'Account cannot exist with the funds that would be given'
    case 'CannotCreate':
      return 'Account cannot be created'
    case 'UnknownAsset':
      return 'The asset in question is unknown'
    case 'Frozen':
      return 'Funds exist but are frozen'
    case 'Unsupported':
      return 'Operation is not supported by the asset'
    case 'CannotCreateHold':
      return 'Account cannot be created for recording amount on hold'
    case 'NotExpendable':
      return 'Account that is desired to remain would die'
    case 'Blocked':
      return 'Account cannot receive the assets'
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

export const getDispatchErrorMessage = (error: DispatchError) => {
  const registryError = handleDispatchError(error)
  if (registryError) return registryError.docs.join('')

  if (error.isToken) return handleTokenError(error.asToken)

  return null
}

export type ExtrinsicErrorsFromEvents = {
  proxyError?: string
  systemError?: string
}

export const getExtrinsicErrorsFromEvents = (
  events: FrameSystemEventRecord[]
): ExtrinsicErrorsFromEvents | undefined => {
  let proxyError: string | undefined
  // check if proxy or multisig call failed
  try {
    const proxyEvent = events.find(({ event }) => event.section === 'proxy' && event.method === 'ProxyExecuted')
    if (proxyEvent) {
      const [result] = proxyEvent.event.data
      const proxyEventResult = result as Result<any, DispatchError>
      if (proxyEventResult.isErr) {
        const errMessage = getDispatchErrorMessage(proxyEventResult.asErr)
        if (errMessage) proxyError = errMessage
      }
    }
  } catch (e) {}

  let systemError: string | undefined
  try {
    const systemFailure = events.find(({ event }) => event.section === 'system' && event.method === 'ExtrinsicFailed')
    if (systemFailure) {
      const [error] = systemFailure.event.data
      const dispatchError = error as DispatchError
      systemError = getDispatchErrorMessage(dispatchError)
    }
  } catch (e) {}

  if (systemError || proxyError) return { proxyError, systemError }
  return undefined
}

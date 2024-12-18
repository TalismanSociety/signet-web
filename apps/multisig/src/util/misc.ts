import { Chain } from '@domains/chains'

export function arrayIntersection<T>(arr1: T[], arr2: T[]): T[] {
  let set = new Set(arr2)
  return arr1.filter(item => set.has(item))
}

export function makeTransactionID(chain: Chain, timepointHeight: number, timepointIndex: number): string {
  return `${chain.id}-${timepointHeight}-${timepointIndex}`
}

export const secondsToDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}secs`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}mins`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}hrs`
  return `${Math.floor(seconds / 86400)}days`
}

export const getErrorString = (error: unknown, maxLength?: number, tooLongMessage?: string): string => {
  const shortenErrorMessage = (error: string) => {
    if (maxLength && error.length > maxLength) return tooLongMessage ?? error.slice(0, maxLength) + '...'
    return error
  }

  if (error instanceof Error) return shortenErrorMessage(error.message)
  if (typeof error === 'object' && (error as any)['reason']) return shortenErrorMessage((error as any).reason)
  if (typeof error === 'string') return shortenErrorMessage(error)

  return shortenErrorMessage(JSON.stringify(error))
}

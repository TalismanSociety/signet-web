import { SubmittableExtrinsic } from '@polkadot/api/types'
import { Address } from './addresses'

export const isExtrinsicProxyWrapped = (extrinsic: SubmittableExtrinsic<'promise'>, realAddress: Address) => {
  const { method, section, args } = extrinsic.method
  const isProxyCall = method === 'proxy' && section === 'proxy'
  let actualCall: Uint8Array | undefined = extrinsic.method.toU8a()
  if (!isProxyCall) return { isWrapped: false, actualCall }

  const addressString = args[0]?.toString()
  if (!addressString) return { isWrapped: false, error: 'No address in proxy call' }

  const address = Address.fromSs58(addressString)
  if (!address) return { isWrapped: false, error: 'Invalid address in proxy call' }

  const isWrapped = address.isEqual(realAddress) && args[1]?.isEmpty
  if (!isWrapped) return { isWrapped: false }

  actualCall = args[2]?.toU8a()
  if (!actualCall) return { isWrapped: false, error: 'No actual call in proxy call' }

  return { isWrapped: true, actualCall }
}

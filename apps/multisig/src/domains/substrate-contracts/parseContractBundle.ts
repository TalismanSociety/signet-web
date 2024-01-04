import { ParsedContractBundle } from './contracts.types'
import { isValidContractBundle } from './isValidContractBundle'

export const parseContractBundle = (bundle: any): ParsedContractBundle | false => {
  const isValid = isValidContractBundle(bundle)
  if (!isValid) return false

  return {
    source: {
      hash: bundle.source.hash,
    },
    contract: {
      name: bundle.contract.name,
    },
    spec: {
      messages: bundle.spec.messages ?? [],
      constructors: bundle.spec.constructors ?? [],
    },
    raw: JSON.stringify(bundle),
  }
}

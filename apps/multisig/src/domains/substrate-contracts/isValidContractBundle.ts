export const isValidContractBundle = (bundle: any) => {
  if (typeof bundle !== 'object' || bundle === null) return false

  // check source
  if (typeof bundle.source !== 'object') return false
  if (typeof bundle.source?.hash !== 'string') return false

  // check contract object
  if (typeof bundle.contract !== 'object') return false
  if (typeof bundle.contract?.name !== 'string') return false

  // check spec (abi)
  if (typeof bundle.spec !== 'object') return false
  if (bundle.spec.messages && !Array.isArray(bundle.spec.messages)) return false
  if (bundle.spec.constructors && !Array.isArray(bundle.spec?.constructors)) return false

  return true
}

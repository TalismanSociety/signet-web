import { Abi } from '@polkadot/api-contract'

export const parseContractBundle = (abiString: string): { abi?: Abi; error?: string } => {
  try {
    return { abi: new Abi(abiString) }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

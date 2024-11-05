import { TransactionType } from '@domains/offchain-data/metadata/types'
import { TxDecoder } from './tx-decoders.types'
import BN from 'bn.js'

export const decodeInstantiate: TxDecoder = ({ methodArg, metadata }) => {
  if (methodArg?.section === 'contracts' && methodArg?.method === 'instantiateWithCode') {
    const { code, data, salt, value } = methodArg.args
    const valueBN = new BN(value.replaceAll(',', ''))
    return {
      decoded: {
        type: TransactionType.DeployContract,
        recipients: [],
        contractDeployment: metadata?.contractDeployed
          ? {
              abi: metadata.contractDeployed.abi,
              code,
              data,
              salt,
              name: metadata.contractDeployed.name,
              value: valueBN,
            }
          : undefined,
      },
      description: metadata?.description ?? `Deploy contract ${metadata?.contractDeployed?.name}`,
    }
  }

  return null
}

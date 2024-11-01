import { TransactionType } from '@domains/offchain-data/metadata/types'
import { TxDecoder } from './tx-decoders.types'
import { Address, parseCallAddressArg } from '@util/addresses'

export const decodeNominate: TxDecoder = ({ methodArg, metadata }) => {
  // Check if it's a NominateFromNomPool type
  if (methodArg?.section === 'nominationPools' && methodArg?.method === 'nominate') {
    const { pool_id, validators } = methodArg.args
    return {
      decoded: {
        type: TransactionType.NominateFromNomPool,
        recipients: [],
        nominate: {
          poolId: +pool_id,
          validators: (validators as any[])
            .map(parseCallAddressArg)
            .map(a => (Address.fromSs58(a) as Address).toSs58()),
        },
      },
      description: metadata?.description ?? `Nominations for Pool #${pool_id}`,
    }
  }

  // Check if it's a NominateFromStaking type
  if (methodArg?.section === 'staking' && methodArg?.method === 'nominate') {
    const { targets } = methodArg.args
    return {
      decoded: {
        type: TransactionType.NominateFromStaking,
        recipients: [],
        nominate: {
          validators: (targets as any[]).map(parseCallAddressArg).map(a => (Address.fromSs58(a) as Address).toSs58()),
        },
      },
      description: metadata?.description ?? `Nominate Validators`,
    }
  }

  return null
}

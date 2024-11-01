import { TransactionType } from '@domains/offchain-data/metadata/types'
import { TxDecoder } from './tx-decoders.types'
import BN from 'bn.js'
import { formatUnits } from '@util/numbers'

export const decodeBond: TxDecoder = ({ methodArg, metadata, tokens }) => {
  const [token] = tokens
  if (!token) return null

  // Check if it's a NominateFromNomPool type
  if (methodArg?.section === 'staking' && methodArg?.method === 'bond') {
    const { value, payee } = methodArg.args as { value: string; payee: string }
    const valueBN = new BN(value.replaceAll(',', ''))
    return {
      decoded: {
        type: TransactionType.Bond,
        recipients: [],
        bond: {
          value: {
            amount: valueBN,
            token,
          },
          payee,
        },
      },
      description: `Bond${token ? ` ${formatUnits(valueBN, token.decimals)}` : ''} ${token?.symbol}`,
    }
  }

  // Check if it's a NominateFromStaking type
  if (methodArg?.section === 'staking' && methodArg?.method === 'bondExtra') {
    const { max_additional } = methodArg.args as { max_additional: string }
    const value = new BN(max_additional.replaceAll(',', ''))
    return {
      decoded: {
        type: TransactionType.BondExtra,
        recipients: [],
        bond: {
          value: {
            amount: value,
            token,
          },
        },
      },
      description: `Bond extra${token ? ` ${formatUnits(value, token.decimals)}` : ''} ${token?.symbol}`,
    }
  }

  return null
}

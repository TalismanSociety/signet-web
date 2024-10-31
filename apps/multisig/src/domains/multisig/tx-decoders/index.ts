import { decodeChangeConfig } from './change-config.decoder'
import { decodeConvictionVoting } from './conviction-voting.decoder'
import { decodeContractCall } from './contract-call.decoder'
import { decodeNominate } from './nominate.decoder'
import { decodeTransfers } from './transfers.decoder'

import { TxDecoder } from './tx-decoders.types'
import { decodeInstantiate } from './instantiate-contract.decoder'
import { decodeChangeProxy } from './change-proxy.decoder'
import { decodeVestedTransfer } from './vested-transfer.decoder'

export const txDecoders: TxDecoder[] = [
  decodeContractCall,
  decodeChangeConfig,
  decodeChangeProxy,
  decodeConvictionVoting,
  decodeInstantiate,
  decodeNominate,
  decodeTransfers,
  decodeVestedTransfer,
]

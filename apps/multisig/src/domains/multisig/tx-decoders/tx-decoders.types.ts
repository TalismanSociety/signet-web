import { BaseToken } from '@domains/chains'
import { TransactionDecoded, TxMetadata } from '@domains/offchain-data/metadata/types'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { Multisig } from '../types'

type ExtrinsicMethodArgs = {
  args: any
  section: string
  method: string
}

type DecodedExtrinsic = { decoded: TransactionDecoded; description: string }

export type TxDecoder = (params: {
  methodArg: ExtrinsicMethodArgs
  extrinsic: SubmittableExtrinsic<'promise'>
  tokens: BaseToken[]
  metadata?: Partial<TxMetadata> | null
  multisig: Multisig
}) => DecodedExtrinsic | null

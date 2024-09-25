import { ChangeConfigDetails, ContractDetails } from '@domains/multisig'
import { Address } from '@util/addresses'
import { BaseToken } from '@domains/chains'
import BN from 'bn.js'
import { Abi } from '@polkadot/api-contract'
import { VoteDetails } from '@domains/referenda'
import { Multisig } from '@domains/multisig'
import { RawPendingTransaction } from '@domains/chains/storage-getters'
import { FrameSystemEventRecord } from '@polkadot/types/lookup'
import { ExtrinsicErrorsFromEvents } from '@util/errors'

export type RawTxMetadata = {
  team_id: string
  timepoint_height: number
  timepoint_index: number
  chain: string
  call_data: string
  change_config_details: any
  created: string
  description: string
  other_metadata: any
  multisig_address: string
  proxy_address: string
}

export type TxMetadata = {
  extrinsicId: string
  teamId: string
  timepointHeight: number
  timepointIndex: number
  chain: string
  callData: string
  changeConfigDetails?: ChangeConfigDetails
  contractDeployed?: ContractDetails
  created: Date
  description: string
}

type Condition = {
  _eq: number
}

type TimepointCondition = {
  timepoint_height: Condition
  timepoint_index: Condition
}

export type Timepoint = {
  _and: TimepointCondition[]
}

export enum TransactionType {
  MultiSend,
  Transfer,
  ChangeConfig,
  Advanced,
  Vote,
  NominateFromNomPool,
  NominateFromStaking,
  ContractCall,
  DeployContract,
}

export interface Balance {
  token: BaseToken
  amount: BN
}

export type VestingSchedule = {
  start: number
  period: number
  totalAmount: BN
}

export interface TransactionRecipient {
  address: Address
  balance: Balance
  vestingSchedule?: VestingSchedule
}

export interface TransactionDecoded {
  type: TransactionType
  recipients: TransactionRecipient[]
  changeConfigDetails?: {
    signers: Address[]
    threshold: number
  }
  nominate?: {
    poolId?: number
    validators: string[]
  }
  contractCall?: {
    address: Address
    data: `0x${string}`
  }
  contractDeployment?: {
    abi: Abi
    name: string
    code: `0x${string}`
    data: `0x${string}`
    salt: `0x${string}`
    value: BN
  }
  voteDetails?: VoteDetails & { token: BaseToken }
}

export interface TransactionApprovals {
  [key: string]: boolean
}

export interface ExecutedAt {
  block: number
  index: number
  by: Address
  events?: FrameSystemEventRecord[]
  errors?: ExtrinsicErrorsFromEvents
}

export interface Transaction {
  description: string
  hash: `0x${string}`
  multisig: Multisig
  approvals: TransactionApprovals
  executedAt?: ExecutedAt
  date: Date
  rawPending?: RawPendingTransaction
  decoded?: TransactionDecoded
  callData?: `0x${string}`
  id?: string
  metadataSaved?: boolean
  draft?: {
    createdAt: Date
    creator: {
      id: string
      address: Address
    }
    id: string
  }
}

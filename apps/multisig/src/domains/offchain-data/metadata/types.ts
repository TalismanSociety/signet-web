import { ChangeConfigDetails, ContractDetails } from '@domains/multisig'

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

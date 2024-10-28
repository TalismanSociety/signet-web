import { TxMetadata, RawTxMetadata } from '../types'
import { ChangeConfigDetails, ContractDetails } from '@domains/multisig'
import { Address } from '@util/addresses'
import { supportedChains } from '@domains/chains'
import { Abi } from '@polkadot/api-contract'
import { makeTransactionID } from '@util/misc'

export const parseTxMetadata = (rawTxMetadata: RawTxMetadata): TxMetadata => {
  const chain = supportedChains.find(c => c.id === rawTxMetadata.chain)
  if (!chain) throw Error(`Chain ${rawTxMetadata.chain} not found`)

  let changeConfigDetails: ChangeConfigDetails | undefined = undefined
  if (rawTxMetadata.change_config_details) {
    let newMembers: Address[] | undefined = undefined
    let newThreshold: number | undefined
    if (rawTxMetadata.change_config_details.newMembers) {
      newMembers = rawTxMetadata.change_config_details.newMembers.map((s: string) => Address.fromSs58(s))
    }
    if (rawTxMetadata.change_config_details.newThreshold) {
      newThreshold = rawTxMetadata.change_config_details.newThreshold
    }
    if (typeof newThreshold !== 'number' || !newMembers || newThreshold > newMembers.length) {
      console.error(`Invalid change config details: ${rawTxMetadata.change_config_details}`)
    } else {
      changeConfigDetails = { newMembers, newThreshold }
    }
  }

  let contractDeployed: ContractDetails | undefined
  if (rawTxMetadata.other_metadata && rawTxMetadata.other_metadata.contractDeployed) {
    const { name, abiString } = rawTxMetadata.other_metadata.contractDeployed
    if (name && abiString) {
      try {
        const abi = new Abi(abiString)
        contractDeployed = { abi, name }
      } catch (e) {
        console.error('Failed to parse abi', rawTxMetadata)
      }
    }
  }

  return {
    extrinsicId: makeTransactionID(chain, rawTxMetadata.timepoint_height, rawTxMetadata.timepoint_index),
    teamId: rawTxMetadata.team_id,
    timepointHeight: rawTxMetadata.timepoint_height,
    timepointIndex: rawTxMetadata.timepoint_index,
    chain: rawTxMetadata.chain,
    callData: rawTxMetadata.call_data,
    changeConfigDetails,
    created: new Date(rawTxMetadata.created),
    description: rawTxMetadata.description,
    contractDeployed,
  }
}

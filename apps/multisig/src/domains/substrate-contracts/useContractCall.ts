import { ContractPromise } from '@polkadot/api-contract'
import { AbiMessage } from '@polkadot/api-contract/types'
import { useSimulateContractCall } from './useSimulateContractCall'
import { useMemo } from 'react'

// returns the contract as a submittable extrinsic that can be wrapped in our proxy call
export const useContractCall = (contract?: ContractPromise, message?: AbiMessage, args?: any[]) => {
  const { isValidCall, simulating, simulationResult, error, validatedArgs } = useSimulateContractCall(
    contract,
    message,
    args
  )

  const contractCallExtrinsic = useMemo(() => {
    if (!simulationResult || !message || !contract || !validatedArgs || !isValidCall) return undefined
    const fn = contract.tx[message.method]
    if (!fn) return undefined

    const { gasRequired, storageDeposit } = simulationResult
    return fn({ gasLimit: gasRequired, storageDepositLimit: storageDeposit.asCharge }, ...validatedArgs)
  }, [contract, isValidCall, message, simulationResult, validatedArgs])

  return { contractCallExtrinsic, isValidCall, simulating, simulationResult, error }
}

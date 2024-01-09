import { useSelectedMultisig } from '@domains/multisig'
import { ContractPromise } from '@polkadot/api-contract'
import { AbiMessage, ContractCallOutcome } from '@polkadot/api-contract/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BN, BN_ONE } from '@polkadot/util'
import type { WeightV2 } from '@polkadot/types/interfaces'

// Ref: https://substrate.stackexchange.com/a/7275
const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE)
const PROOFSIZE = new BN(1_000_000)

export const useSimulateContractCall = (
  contract?: ContractPromise,
  message?: AbiMessage,
  args?: { value: any; valid: boolean }[]
) => {
  const [simulating, setSimulating] = useState(false)
  const [selectedMultisig] = useSelectedMultisig()
  const [simulationResult, setSimulationResult] = useState<ContractCallOutcome | null>(null)
  const [localError, setLocalError] = useState<string>()

  const validatedArgs = useMemo(() => {
    if (!message || !args) return undefined
    return args.filter(arg => arg && arg.valid).map(({ value }) => value)
  }, [args, message])

  const isValidCall = useMemo(() => {
    return message && validatedArgs && message.args.length === validatedArgs.length
  }, [validatedArgs, message])

  const handleSimulate = useCallback(async () => {
    if (!contract || !message || !validatedArgs) return
    setSimulating(true)
    try {
      const fn = contract.query[message.method]
      if (!fn) return

      const res = await fn(
        selectedMultisig.proxyAddress.toSs58(selectedMultisig.chain),
        // Ref: https://substrate.stackexchange.com/a/7275
        {
          gasLimit: contract.abi.registry.createType('WeightV2', {
            refTime: MAX_CALL_WEIGHT,
            proofSize: PROOFSIZE,
          }) as WeightV2,
          storageDepositLimit: null,
          value: 0,
        },
        ...validatedArgs
      )

      setSimulationResult(res)
    } catch (e) {
      // dont need to set error because the returning useMemo will return unknown error for us
      setLocalError(e instanceof Error ? e.message : 'Unknown error, check logs for details.')
      console.error(e)
    } finally {
      setSimulating(false)
    }
  }, [contract, message, selectedMultisig.chain, selectedMultisig.proxyAddress, validatedArgs])

  useEffect(() => {
    if (!simulationResult && isValidCall) {
      handleSimulate()
    }
  }, [isValidCall, simulationResult, handleSimulate])

  useEffect(() => {
    setSimulationResult(null)
    setLocalError(undefined)
  }, [validatedArgs, contract, message])

  const defaultReturnValues = useMemo(() => {
    return { simulationResult, simulating, isValidCall, validatedArgs }
  }, [isValidCall, simulationResult, simulating, validatedArgs])

  return useMemo((): typeof defaultReturnValues & {
    ok: boolean
    error?: string
  } => {
    if (!simulationResult || !contract) return { ...defaultReturnValues, ok: false, error: localError }

    const { result, debugMessage, output } = simulationResult

    // call was successful
    if (result.isOk) {
      // contract level revert will resolve as successful call, make sure call did not revert from contract level
      const outputRes = output?.toHuman()
      if (typeof outputRes === 'object' && outputRes !== null) {
        const error = (outputRes as any)['Ok']?.['Err']
        if (error) return { ...defaultReturnValues, ok: false, error: `Contract Reverted: ${error}` }
      }

      // call is truly successful and has no revert
      return {
        ...defaultReturnValues,
        ok: true,
      }
    }

    // simulation failed, potentially blockchain error or assertion failed
    let error = localError ?? 'Could not simulate call, unknown error'
    if (result.isErr) {
      const substrateError = contract.api.registry.findMetaError(result.asErr.asModule)
      if (substrateError) {
        error = substrateError.docs.join('')
        error = `Simulation Failed: ${error} (${debugMessage})`
      }
    }
    return { ...defaultReturnValues, ok: false, error }
  }, [contract, defaultReturnValues, localError, simulationResult])
}

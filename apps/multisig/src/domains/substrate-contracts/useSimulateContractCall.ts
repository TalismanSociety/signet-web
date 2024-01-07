import { useSelectedMultisig } from '@domains/multisig'
import { ContractPromise } from '@polkadot/api-contract'
import { AbiMessage, ContractCallOutcome } from '@polkadot/api-contract/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BN, BN_ONE } from '@polkadot/util'
import type { WeightV2 } from '@polkadot/types/interfaces'

const IS_ADDRESS: Record<string, true> = {
  AccountId: true,
  Address: true,
  LookupSource: true,
  MultiAddress: true,
}

// Ref: https://substrate.stackexchange.com/a/7275
const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE)
const PROOFSIZE = new BN(1_000_000)

export const useSimulateContractCall = (contract?: ContractPromise, message?: AbiMessage, args?: any[]) => {
  const [simulating, setSimulating] = useState(false)
  const [selectedMultisig] = useSelectedMultisig()
  const [res, setRes] = useState<ContractCallOutcome | null>(null)
  const [localError, setLocalError] = useState<string>()

  const formattedArgs = useMemo(() => {
    if (!message || !args) return undefined
    const formattedArgs: any[] = []
    message.args.forEach((arg, i) => {
      const argInput = args[i]
      if (!argInput || !argInput.valid) return

      if (IS_ADDRESS[arg?.type.type]) {
        formattedArgs.push(argInput.value)
      } else {
        formattedArgs.push(args[i].value)
      }
    })
    return formattedArgs
  }, [args, message])

  const isValidCall = useMemo(() => {
    return message && formattedArgs && message.args.length === formattedArgs.length
  }, [formattedArgs, message])

  const handleSimulate = useCallback(async () => {
    if (!contract || !message || !formattedArgs) return
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
        ...formattedArgs
      )

      setRes(res)
    } catch (e) {
      // dont need to set error because the returning useMemo will return unknown error for us
      setLocalError(e instanceof Error ? e.message : 'Unknown error, check logs for details.')
      console.error(e)
    } finally {
      setSimulating(false)
    }
  }, [contract, formattedArgs, message, selectedMultisig.chain, selectedMultisig.proxyAddress])

  useEffect(() => {
    if (!res && isValidCall) {
      handleSimulate()
    }
  }, [isValidCall, res, handleSimulate])

  useEffect(() => {
    setRes(null)
    setLocalError(undefined)
  }, [formattedArgs, contract, message])

  const defaultReturnValues = useMemo(() => {
    return { res, simulating, isValidCall }
  }, [isValidCall, res, simulating])

  return useMemo((): typeof defaultReturnValues & { ok: boolean; call?: {}; error?: string } => {
    if (!res || !contract) return { ...defaultReturnValues, ok: false, error: localError }

    const { result, gasRequired, gasConsumed, debugMessage, output } = res

    // call was successful
    if (result.isOk) {
      // contract level revert will resolve as successful call, make sure call did not revert from contract level
      const outputRes = output?.toHuman()
      console.log(outputRes)
      if (typeof outputRes === 'object' && outputRes !== null) {
        const error = (outputRes as any)['Ok']?.['Err']
        if (error) return { ...defaultReturnValues, ok: false, error: `Contract Reverted: ${error}` }
      }

      // call is truly successful and has no revert
      return {
        ...defaultReturnValues,
        ok: true,
        call: {
          returnData: result.asOk.data,
          gasRequired,
          gasConsumed,
        },
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
  }, [contract, defaultReturnValues, localError, res])
}

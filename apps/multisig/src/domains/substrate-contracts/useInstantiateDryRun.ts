import { Multisig } from '@domains/multisig'
import { ApiPromise, SubmittableResult } from '@polkadot/api'
import { Abi } from '@polkadot/api-contract'
import { AbiMessage } from '@polkadot/api-contract/types'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { useCallback, useEffect, useState } from 'react'
import { BN_ZERO } from '@polkadot/util'
import { ContractInstantiateResult } from '@polkadot/types/interfaces/contracts'
import { getErrorString } from '@util/misc'
import { isEqual } from 'lodash'

type DeployArgs = {
  constructor: AbiMessage
  args: any[]
}
type Props = {
  api?: ApiPromise
  abi?: Abi
  extrinsic?: SubmittableExtrinsic<'promise', SubmittableResult>
  deployArgs?: DeployArgs
  multisig: Multisig
  skip?: boolean
}

export const useInstantiateDryRun = ({ api, abi, deployArgs, extrinsic, multisig, skip }: Props) => {
  const [lastRunFor, setLastRunFor] = useState<DeployArgs>()
  const [dryRunResult, setDryRunResult] = useState<ContractInstantiateResult>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  const estimateGas = useCallback(async () => {
    if (!api || !extrinsic || !deployArgs || !abi || skip) return
    if (lastRunFor?.constructor.index === deployArgs.constructor.index && isEqual(deployArgs.args, lastRunFor.args))
      return
    setError(undefined)
    setDryRunResult(undefined)

    setLastRunFor(deployArgs)
    setLoading(true)
    const { constructor, args } = deployArgs
    const data = constructor.toU8a(args)

    try {
      const dryRunResult = await api.call.contractsApi.instantiate(
        multisig.proxyAddress.toSs58(),
        BN_ZERO, // TODO: handle payable
        null,
        null,
        { Upload: abi.info.source.wasm },
        data,
        new Uint8Array()
      )
      if (dryRunResult.result.isErr) {
        const error = api.registry.findMetaError(dryRunResult.result.asErr.asModule)
        throw new Error(error.docs.join(' '))
      }
      setDryRunResult(dryRunResult)
    } catch (e) {
      console.error('Failed to dry run instantiate', e)
      setError(getErrorString(e))
    } finally {
      setLoading(false)
    }
  }, [abi, api, deployArgs, extrinsic, lastRunFor, multisig.proxyAddress, skip])

  useEffect(() => {
    estimateGas()
  }, [estimateGas])

  return {
    dryRunResult,
    error,
    loading,
  }
}

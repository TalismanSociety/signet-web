import { ContractMessageForm } from '@components/ContractMessageForm'
import { ContractUploader } from '@components/ContractUploader'
import { TransactionSidesheet } from '@components/TransactionSidesheet'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { useApi } from '@domains/chains/pjs-api'
import { useSelectedMultisig } from '@domains/multisig'
import { Abi, CodePromise } from '@polkadot/api-contract'
import { AbiMessage } from '@polkadot/api-contract/types'
import { useCallback, useMemo, useState } from 'react'

export const DepolyContractPage: React.FC = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig.chain.rpcs)
  const [name, setName] = useState('')
  const [abi, setAbi] = useState<Abi>()
  const [reviewing, setReviewing] = useState(false)
  const [deployArgs, setDeployArgs] = useState<{
    message: AbiMessage
    args: {
      value: any
      valid: boolean
    }[]
  }>()

  const codePromise = useMemo(() => {
    if (!abi || !api) return undefined
    try {
      return new CodePromise(api, abi, abi.info.source.wasm)
    } catch (e) {
      return undefined
    }
  }, [abi, api])

  const handleAbi = useCallback(
    (abi?: Abi) => {
      if (name === '' && abi) setName(abi.info.contract.name.toString())
      setAbi(abi)
      if (!abi) setDeployArgs(undefined)
    },
    [name]
  )

  const isNotReady = useMemo(() => {
    return (
      !name ||
      !api ||
      !abi ||
      (abi.constructors.length > 0 && !deployArgs) ||
      deployArgs?.args.some(({ valid }) => !valid) ||
      deployArgs?.args.length !== deployArgs?.message.args.length
    )
  }, [abi, api, deployArgs, name])

  const extrinsic = useMemo(
    () =>
      codePromise && deployArgs && !isNotReady
        ? codePromise.tx[deployArgs.message.method]?.({}, ...deployArgs.args.map(({ value }) => value))
        : undefined,
    [codePromise, deployArgs, isNotReady]
  )

  const handleMessageChange = useCallback((message: AbiMessage, args: any[]) => setDeployArgs({ message, args }), [])

  return (
    <div>
      <h1 className="text-[24px]">Deploy a Smart Contract</h1>
      <p>Deploy and manage a smart contract from your Signet vault.</p>

      <div className="mt-[24px] flex flex-col gap-[16px] items-start">
        <Input
          label="Contract Name"
          placeholder="e.g. Protocol Token"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <ContractUploader onContractChange={handleAbi} />

        {abi && abi.constructors.length > 0 && (
          <div className="w-full">
            <ContractMessageForm
              label="Constructor"
              messages={abi.constructors}
              onChange={handleMessageChange}
              chain={selectedMultisig.chain}
            />
          </div>
        )}

        <Button className="mt-[16px]" disabled={isNotReady} onClick={() => setReviewing(true)}>
          Review
        </Button>
      </div>
      {extrinsic && abi && (
        <TransactionSidesheet
          calldata={extrinsic?.method.toHex()}
          description={`Deploy ${name}`}
          open={reviewing}
          onClose={() => setReviewing(false)}
          otherTxMetadata={{
            contractDeployed: { name, abi },
          }}
        />
      )}
    </div>
  )
}

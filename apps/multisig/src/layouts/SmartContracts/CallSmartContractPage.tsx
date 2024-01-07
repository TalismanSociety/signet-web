import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { ContractMessageForm } from '@components/ContractMessageForm'
import { StatusMessage } from '@components/StatusMessage'
import { Button } from '@components/ui/button'
import { useApi } from '@domains/chains/pjs-api'
import { useSelectedMultisig } from '@domains/multisig'
import { useSmartContracts } from '@domains/offchain-data'
import { useContractPallet } from '@domains/substrate-contracts'
import { useSimulateContractCall } from '@domains/substrate-contracts/useSimulateContractCall'
import { ContractPromise } from '@polkadot/api-contract'
import { AbiMessage } from '@polkadot/api-contract/types'
import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

export const CallSmartContractPage: React.FC = () => {
  const { smartContractId } = useParams<{ smartContractId: string }>()
  const { loading, contracts } = useSmartContracts()
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig?.chain.rpcs)
  const { loading: loadingPallet, supported } = useContractPallet(api)
  const [message, setMessage] = useState<AbiMessage>()
  const [args, setArgs] = useState<{ value: any; valid: boolean }[]>([])

  const contractDetails = useMemo(() => {
    return contracts?.find(({ id }) => id === smartContractId)
  }, [contracts, smartContractId])

  const contract = useMemo(() => {
    if (!contractDetails || !api) return undefined
    return new ContractPromise(api, contractDetails.abiString, contractDetails.address.toSs58(selectedMultisig.chain))
  }, [contractDetails, api, selectedMultisig.chain])

  const writeMethods = useMemo(
    () => contractDetails?.abi.messages.filter(({ isMutating }) => isMutating),
    [contractDetails]
  )

  const { isValidCall, simulating, call, error } = useSimulateContractCall(contract, message, args)
  // param not provided, invalid url
  if (!smartContractId) return <Navigate to="smart-contracts" />

  if (!supported) {
    if (loadingPallet) return <StatusMessage type="loading" message="Loading contracts pallet..." />
    return <p className="text-center">Smart contracts not supported on this network.</p>
  }

  if (!contractDetails || !writeMethods) {
    if (loading) return <StatusMessage type="loading" message="Loading contracts..." />
    return (
      <p className="text-center">
        Contract not found in <b className="text-offWhite">{selectedMultisig.name}</b>
      </p>
    )
  }

  return (
    <div className="w-full">
      <h1 className="text-[24px]">Make a contract call</h1>

      <div className="mt-[24px]">
        <h4 className="font-semibold text-offWhite">Contract Name</h4>
        <div className="w-max [&>div>div>p]:!text-[16px]">
          <AccountDetails
            address={contractDetails.address}
            chain={selectedMultisig.chain}
            name={contractDetails.name}
            withAddressTooltip
          />
        </div>
      </div>

      <div className="mt-[32px] flex flex-col gap-[16px] items-start w-full">
        <h4 className="font-semibold text-offWhite">Call details</h4>
        {writeMethods.length > 0 ? (
          <>
            <ContractMessageForm
              messages={writeMethods}
              onChange={(message, args) => {
                setMessage(message)
                setArgs(args)
              }}
              chain={selectedMultisig.chain}
            />
            <div className="flex w-full flex-col items-start">
              <Button className="mt-[24px]" disabled={!isValidCall || !call}>
                Review
              </Button>
              {isValidCall && (
                <div className="mt-[12px]">
                  {simulating ? (
                    <StatusMessage type="loading" message="Simulating call..." />
                  ) : !!call ? (
                    <StatusMessage type="success" message="Call simulation was successful!" />
                  ) : !!error ? (
                    <StatusMessage type="error" message={error} />
                  ) : null}
                </div>
              )}
            </div>
          </>
        ) : (
          <p>The contract has no callable functions.</p>
        )}
      </div>
    </div>
  )
}

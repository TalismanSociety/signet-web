import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { ContractMessageForm } from '@components/ContractMessageForm'
import { StatusMessage } from '@components/StatusMessage'
import { useApi } from '@domains/chains/pjs-api'
import { useSelectedMultisig } from '@domains/multisig'
import { useSmartContracts } from '@domains/offchain-data'
import { useContractPallet } from '@domains/substrate-contracts'
import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'

export const CallSmartContractPage: React.FC = () => {
  const { smartContractId } = useParams<{ smartContractId: string }>()
  const { loading, contracts } = useSmartContracts()
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig?.chain.rpcs)
  const { loading: loadingPallet, supported } = useContractPallet(api)

  const contract = useMemo(() => contracts?.find(({ id }) => id === smartContractId), [contracts, smartContractId])
  const writeMethods = useMemo(() => contract?.abi.messages.filter(({ isMutating }) => isMutating), [contract])

  // param not provided, invalid url
  if (!smartContractId) return <Navigate to="smart-contracts" />

  if (!supported) {
    if (loadingPallet) return <StatusMessage type="loading" message="Loading contracts pallet..." />
    return <p className="text-center">Smart contracts not supported on this network.</p>
  }

  if (!contract || !writeMethods) {
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
        <h4 className="font-semibold text-offWhite">Contract</h4>
        <div className="w-max [&>div>div>p]:!text-[16px]">
          <AccountDetails
            address={contract.address}
            chain={selectedMultisig.chain}
            name={contract.name}
            nameOrAddressOnly
            withAddressTooltip
          />
        </div>
      </div>

      <div className="mt-[32px] flex flex-col gap-[16px] items-start w-full">
        <h4 className="font-semibold text-offWhite">Call details</h4>
        {writeMethods.length > 0 ? (
          <ContractMessageForm messages={writeMethods} onChange={console.log} chain={selectedMultisig.chain} />
        ) : (
          <p>The contract has no callable functions.</p>
        )}
      </div>
    </div>
  )
}

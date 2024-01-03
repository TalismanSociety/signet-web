import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { Button } from '@components/ui/button'
import { useCallback, useMemo, useState } from 'react'
import { useSelectedMultisig } from '@domains/multisig'
import { useApi } from '@domains/chains/pjs-api'
import { useContractPallet } from '@domains/substrate-contracts/useContractPallet'
import { CircularProgressIndicator } from '@talismn/ui'
import { Address } from '@util/addresses'
import { CheckCircle, XCircle } from '@talismn/icons'
import { ParsedContractBundle, SubstrateContractFromPallet } from '@domains/substrate-contracts/contracts.types'
import { parseContractBundle } from '@domains/substrate-contracts/isValidContractBundle'

export const AddContractPage: React.FC = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig?.chain.rpcs)
  const { loading, supported, getContractInfo } = useContractPallet(api)
  const [checkingAddress, setCheckingAddress] = useState(false)

  const [contractAddress, setContractAddress] = useState('')
  const [contractBundle, setContractBundle] = useState('')
  const [validContract, setValidContract] = useState<SubstrateContractFromPallet | false>()
  const [validContractBundle, setValidContractBundle] = useState<ParsedContractBundle | false>()

  const handleAddressChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const addressString = e.target.value
      setContractAddress(e.target.value)
      setValidContract(undefined)

      if (addressString === '') return
      setCheckingAddress(true)
      try {
        const address = Address.fromSs58(addressString)
        if (!address) return

        const contract = await getContractInfo(addressString)
        if (!contract) return
        setValidContract(contract.isSome ? (contract.toHuman() as SubstrateContractFromPallet) : false)
      } catch (e) {
        console.log(e)
      } finally {
        setCheckingAddress(false)
      }
    },
    [getContractInfo]
  )

  const handleContractBundleChange = (value: string) => {
    setContractBundle(value)

    try {
      const json = JSON.parse(value)
      const contract = parseContractBundle(json)
      setValidContractBundle(contract)
    } catch (e) {
      setValidContractBundle(false)
    } finally {
    }
  }

  const contractAddressSupportingLabel = useMemo(() => {
    if (checkingAddress)
      return (
        <div className="mt-[8px] flex items-center gap-[4px]">
          <CircularProgressIndicator size={16} />
          <p className="text-[12px] mt-[2px]">Loading contract...</p>
        </div>
      )

    if (validContract === undefined) return null

    if (validContract)
      return (
        <div className="text-green-400 mt-[8px] flex items-center gap-[4px]">
          <CheckCircle size={16} />
          <p className="text-[12px] mt-[2px]">Valid contract address.</p>
        </div>
      )

    return (
      <div className="text-red-500 mt-[8px] flex items-center gap-[4px]">
        <XCircle size={16} />
        <p className="text-[12px] mt-[2px]">The address is not a contract on this chain.</p>
      </div>
    )
  }, [checkingAddress, validContract])

  if (loading) return <CircularProgressIndicator />
  if (!supported) return <p>Smart contracts not supported on this network.</p>

  return (
    <div>
      <h1 className="text-[24px]">Add a Smart Contract</h1>
      <p>Add a smart contract to Signet to start interacting with it using your Signet Vault.</p>

      <div className="mt-[24px] flex flex-col gap-[16px] items-start">
        <h4 className="font-semibold text-offWhite">Contract details</h4>

        <Input label="Contract Name" placeholder="e.g. Protocol Token" />
        <Input
          value={contractAddress}
          onChange={handleAddressChange}
          label="Contract address"
          placeholder="Enter contract address"
          supportingLabel={contractAddressSupportingLabel}
        />
        <div className="w-full">
          <Textarea
            value={contractBundle}
            onChange={e => handleContractBundleChange(e.target.value)}
            label="Contract Bundle"
            placeholder="Enter contract bundle (content in .contract file)"
            className="!min-h-[220px] text-[14px] placeholder:text-[18px]"
          />
          {contractBundle.length > 0 && !validContractBundle && (
            <p className="text-red-400 text-[12px] mt-[8px]">
              The contract bundle is invalid. Please check the JSON format and try again.
            </p>
          )}
          {validContractBundle && validContract && validContract.codeHash !== validContractBundle.source.hash && (
            <p className="text-red-400 text-[12px] mt-[8px]">
              The code hash does not match code hash of contract address.
            </p>
          )}
        </div>

        <Button
          className="mt-[24px]"
          disabled={
            !validContract || !validContractBundle || validContract.codeHash !== validContractBundle.source.hash
          }
        >
          Add Contract
        </Button>
      </div>
    </div>
  )
}

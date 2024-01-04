import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { Button } from '@components/ui/button'
import { useCallback, useMemo, useState } from 'react'
import { useSelectedMultisig } from '@domains/multisig'
import { useApi } from '@domains/chains/pjs-api'
import { CircularProgressIndicator } from '@talismn/ui'
import { Address } from '@util/addresses'
import {
  parseContractBundle,
  useContractPallet,
  ParsedContractBundle,
  SubstrateContractFromPallet,
} from '@domains/substrate-contracts'
import { StatusMessage } from '@components/StatusMessage'
import { useToast } from '@components/ui/use-toast'
import { useAddSmartContract, useSmartContracts } from '@domains/offchain-data'
import { getErrorString } from '@util/misc'
import { useNavigate } from 'react-router-dom'

export const AddContractPage: React.FC = () => {
  const navigate = useNavigate()
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig?.chain.rpcs)
  const { loading, supported, getContractInfo } = useContractPallet(api)
  const [checkingAddress, setCheckingAddress] = useState(false)

  const [name, setName] = useState('')
  const [contractAddress, setContractAddress] = useState('')
  const [contractBundle, setContractBundle] = useState('')
  const [validContract, setValidContract] = useState<SubstrateContractFromPallet | false>()
  const [parsedContractAddress, setParsedContractAddress] = useState<Address | false>()
  const [validContractBundle, setValidContractBundle] = useState<ParsedContractBundle | false>()

  const { contracts, contractsByAddress, loading: loadingAddedContracts } = useSmartContracts()
  const { addContract, loading: addingContract } = useAddSmartContract()

  const { toast } = useToast()

  const handleAddressChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const addressString = e.target.value
      setContractAddress(e.target.value)
      setValidContract(undefined)
      setParsedContractAddress(undefined)

      if (addressString === '') return
      setCheckingAddress(true)
      try {
        const address = Address.fromSs58(addressString)
        if (!address) return

        const contract = await getContractInfo(addressString)
        if (!contract) return
        setParsedContractAddress(address)
        setValidContract(contract.isSome ? (contract.toHuman() as SubstrateContractFromPallet) : false)
      } catch (e) {
        console.error(e)
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

  const contractExists = useMemo(
    () => parsedContractAddress && !!contractsByAddress?.[parsedContractAddress.toSs58()],
    [contractsByAddress, parsedContractAddress]
  )

  const contractAddressSupportingLabel = useMemo(() => {
    if (contractExists)
      return (
        <StatusMessage className="mt-[8px]" type="error" message="The contract has already been added to your Vault." />
      )
    if (checkingAddress) return <StatusMessage type="loading" message="Loading contract..." className="mt-[8px]" />
    if (validContract === undefined) return null
    return (
      <StatusMessage
        type={validContract ? 'success' : 'error'}
        message={validContract ? 'Valid contract address.' : 'The address is not a contract on this chain.'}
        className="mt-[8px]"
      />
    )
  }, [checkingAddress, contractExists, validContract])

  const handleAddContract = useCallback(async () => {
    // this should be blocked by button but we're adding here for type safety
    if (!name || !parsedContractAddress || !validContractBundle) return

    try {
      const contract = await addContract(parsedContractAddress, name, selectedMultisig.id, validContractBundle)
      toast({
        title: 'Contract added!',
        description: `You may now interact with ${name}`,
      })
      navigate(`/smart-contracts/call/${contract.id}`)
    } catch (e) {
      toast({
        title: 'Error adding contract',
        description: getErrorString(e, 120),
      })
    }
  }, [addContract, name, navigate, parsedContractAddress, selectedMultisig.id, toast, validContractBundle])

  if (loading || (contracts === undefined && loadingAddedContracts)) return <CircularProgressIndicator />
  if (!supported) return <p>Smart contracts not supported on this network.</p>

  return (
    <div>
      <h1 className="text-[24px]">Add a Smart Contract</h1>
      <p>Add a smart contract to Signet to start interacting with it using your Signet Vault.</p>

      <div className="mt-[24px] flex flex-col gap-[16px] items-start">
        <h4 className="font-semibold text-offWhite">Contract details</h4>

        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          label="Contract Name"
          placeholder="e.g. Protocol Token"
        />
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
            <StatusMessage
              type="error"
              message="The contract bundle is invalid. Please check the JSON format and try again."
              className="mt-[8px]"
            />
          )}
          {validContractBundle && validContract && validContract.codeHash !== validContractBundle.source.hash && (
            <StatusMessage type="error" message="The code hash does not match code hash of contract address." />
          )}
        </div>

        <Button
          className="mt-[24px]"
          disabled={
            !validContract ||
            !parsedContractAddress ||
            !validContractBundle ||
            validContract.codeHash !== validContractBundle.source.hash ||
            contractExists ||
            addingContract
          }
          loading={addingContract}
          onClick={handleAddContract}
        >
          Add Contract
        </Button>
      </div>
    </div>
  )
}
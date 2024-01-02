import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { Button } from '@components/ui/button'
import { useCallback, useState } from 'react'
import { useSelectedMultisig } from '@domains/multisig'
import { useApi } from '@domains/chains/pjs-api'
import { useContractPallet } from '@domains/substrate-contracts/useContractPallet'
import { CircularProgressIndicator } from '@talismn/ui'
import { Address } from '../../util/addresses'

export const AddContractPage: React.FC = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig?.chain.rpcs)
  const { loading, supported, getContractInfo } = useContractPallet(api)
  const [checkingAddress, setCheckingAddress] = useState(false)

  const [contractAddress, setContractAddress] = useState('')
  const [abi, setAbi] = useState('')

  const handleAddressChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const addressString = e.target.value
      setContractAddress(e.target.value)

      if (addressString === '') return
      setCheckingAddress(true)
      try {
        const address = Address.fromSs58(addressString)
        if (!address) return

        const contract = await getContractInfo(addressString)
        console.log(contract)
      } catch (e) {
        console.log(e)
      } finally {
        setCheckingAddress(false)
      }
    },
    [getContractInfo]
  )

  if (loading) return <CircularProgressIndicator />
  if (!supported) return <p>Smart contracts not supported on this network.</p>
  return (
    <div>
      <h1 className="text-[24px]">Add a Smart Contract</h1>
      <p>Add a smart contract to Signet to start interacting with it using your Signet Vault.</p>

      <div className="mt-[24px]">
        <h4 className="font-semibold text-offWhite mb-[16px]">Contract details</h4>

        <Input
          value={contractAddress}
          onChange={handleAddressChange}
          label="Contract address"
          placeholder="Enter contract address"
          className="mb-[16px]"
          loading={checkingAddress}
        />
        <Textarea
          value={abi}
          onChange={e => setAbi(e.target.value)}
          label="ABI"
          placeholder="Enter ABI"
          className="!min-h-[220px] text-[14px] placeholder:text-[18px]"
        />

        <Button className="mt-[24px]">Review</Button>
      </div>
    </div>
  )
}

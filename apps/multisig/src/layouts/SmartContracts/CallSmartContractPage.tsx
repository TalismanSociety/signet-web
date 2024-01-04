import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { StatusMessage } from '@components/StatusMessage'
import { Button } from '@components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@components/ui/command'
import { Popover, PopoverContent } from '@components/ui/popover'
import { useApi } from '@domains/chains/pjs-api'
import { useSelectedMultisig } from '@domains/multisig'
import { useSmartContracts } from '@domains/offchain-data'
import { useContractPallet } from '@domains/substrate-contracts'
import { PopoverTrigger } from '@radix-ui/react-popover'
import { ChevronDown } from '@talismn/icons'
import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

export const CallSmartContractPage: React.FC = () => {
  const { smartContractId } = useParams<{ smartContractId: string }>()
  const { loading, contracts } = useSmartContracts()
  const [selectedMultisig] = useSelectedMultisig()
  const { api } = useApi(selectedMultisig?.chain.rpcs)
  const { loading: loadingPallet, supported } = useContractPallet(api)
  const [methodIndex, setMethodIndex] = useState(0)
  const [openMethod, setOpenMethod] = useState(false)

  const contract = useMemo(() => contracts?.find(({ id }) => id === smartContractId), [contracts, smartContractId])

  const writeMethods = useMemo(() => contract?.abi.spec.messages.filter(({ mutates }) => mutates), [contract])

  const selectedMethod = useMemo(() => {
    return writeMethods?.[methodIndex] ?? writeMethods?.[0]
  }, [methodIndex, writeMethods])

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
        <div className="w-full">
          <p className="text-[14px] mb-[4px]">Message to send</p>
          {writeMethods.length > 0 ? (
            <Popover open={openMethod} onOpenChange={setOpenMethod}>
              <PopoverTrigger asChild>
                <Button className="w-full h-16 px-[16px]" variant="secondary">
                  <div className="flex items-center justify-between w-full">
                    <p>{selectedMethod?.label}</p>
                    <ChevronDown />
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Command>
                  <CommandInput placeholder="Search methods" />
                  <CommandSeparator />
                  <CommandList>
                    <CommandEmpty>No methods found</CommandEmpty>
                    <CommandGroup className="p-[8px]">
                      {writeMethods.map(({ label, docs }, index) => (
                        <CommandItem
                          key={label}
                          className="rounded-[8px] flex flex-col text-left items-start py-[8px] px-[12px] text-ellipsis overflow-hidden whitespace-nowrap w-full"
                          value={`${index}`}
                          onSelect={() => {
                            setMethodIndex(+index)
                            setOpenMethod(false)
                          }}
                        >
                          <p className="text-offWhite text-[14px]">{label}</p>
                          {docs?.[0] && (
                            <p className="text-[12px] text-gray-200 text-ellipsis overflow-hidden whitespace-nowrap w-full">
                              {docs.join('')}
                            </p>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <p>The contract has no callable functions.</p>
          )}
        </div>
      </div>
    </div>
  )
}

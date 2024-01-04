import { useEffect, useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Button } from './ui/button'
import { ChevronDown, ToggleLeft, ToggleRight } from '@talismn/icons'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './ui/command'
import { AbiMessage } from '@polkadot/api-contract/types'
import { MessageSignature } from './SubstrateContractAbi/MessageSignature'
import { Chain } from '@domains/chains'
import { encodeTypeDef } from '@polkadot/types/create'
import { useApi } from '@domains/chains/pjs-api'

type Props = {
  messages: AbiMessage[]
  onChange: (message: AbiMessage, args: any[]) => void
  chain: Chain
}

export const ContractMessageForm: React.FC<Props> = ({ messages, onChange, chain }) => {
  const [messageIndex, setMessageIndex] = useState(0)
  const [openMethod, setOpenMethod] = useState(false)
  const { api } = useApi(chain.rpcs)
  const [args, setArgs] = useState<any[]>([])

  const selectedMessage = useMemo(() => messages[messageIndex] ?? messages?.[0], [messageIndex, messages])

  useEffect(() => {
    if (!selectedMessage) return
    onChange(selectedMessage, [])
  }, [onChange, selectedMessage])

  if (!selectedMessage) return null

  return (
    <div className="w-full">
      {/** Message selector */}
      <div className="w-full">
        <p className="text-[14px] mb-[4px]">Message to send</p>
        <Popover open={openMethod} onOpenChange={setOpenMethod}>
          <PopoverTrigger asChild>
            <Button className="w-full h-16 px-[20px]" variant="secondary">
              <div className="flex items-center justify-between w-full">
                <MessageSignature message={selectedMessage} chain={chain} withoutDocs />
                <ChevronDown />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <Command>
              <CommandInput placeholder="Search methods..." />
              <CommandSeparator />
              <CommandList>
                <CommandEmpty>No methods found</CommandEmpty>
                <CommandGroup>
                  {messages.map((message, index) => (
                    <CommandItem
                      key={`${message.method}_${message.selector}`}
                      className="flex flex-col text-left items-start text-ellipsis overflow-hidden whitespace-nowrap w-full"
                      value={`${index}`}
                      onSelect={() => {
                        setMessageIndex(index)
                        setOpenMethod(false)
                        setArgs([])
                      }}
                    >
                      <MessageSignature message={message} chain={chain} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/** Render args form for selected message */}
      {api && selectedMessage.args.length > 0 && (
        <div className="pl-[24px] mt-[16px]">
          {selectedMessage.args.map((arg, index) => (
            <div>
              <p className="text-[14px]">
                {arg.name}: {encodeTypeDef(api.registry, arg.type)}
                {arg.type.type === 'bool' ? (
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      const oldArgs = [...args]
                      oldArgs[index] = !oldArgs[index]
                      setArgs(oldArgs)
                      onChange(selectedMessage, oldArgs)
                    }}
                  >
                    {args[index] ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </div>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { Chain } from '@domains/chains'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { CancleOrNext } from './CancelOrNext'
import { useCallback, useMemo } from 'react'
import { AccountsList } from '@components/AccountMenu/AccountsList'

const Group = (props: { chains: Chain[]; label: string }) => (
  <SelectGroup>
    <SelectLabel>{props.label}</SelectLabel>
    <div className="grid grid-cols-2 w-full">
      {props.chains.map(chain => (
        <SelectItem value={chain.genesisHash} key={chain.genesisHash}>
          <div className="w-full flex items-center gap-[12px]">
            <div className="w-[40px] h-[40px] min-h-[40px] min-w-[40px]">
              <img src={chain.logo} alt={chain.chainName} />
            </div>
            <p>{chain.chainName}</p>
          </div>
        </SelectItem>
      ))}
    </div>
  </SelectGroup>
)

const SelectChain = ({
  header,
  onNext,
  onBack,
  setChain,
  chain,
  chains,
  isChainAccountEth,
  augmentedAccountsLength,
}: {
  header?: string
  isChainAccountEth?: boolean
  onNext: () => void
  onBack: () => void
  setChain: (chain: Chain) => void
  chain: Chain
  chains: Chain[]
  augmentedAccountsLength?: number
}) => {
  const mainnets = useMemo(() => chains.filter(chain => !chain.isTestnet), [chains])
  const testnets = useMemo(() => chains.filter(chain => chain.isTestnet), [chains])

  const onValueChange = useCallback(
    (value: string) => {
      setChain(chains.find(chain => chain.genesisHash === value) as Chain)
    },
    [setChain, chains]
  )

  return (
    <div className="grid items-center justify-center gap-[12px] w-full max-w-[540px]">
      <div>
        <h4 className="text-[14px] text-center font-bold mb-[4px]">{header}</h4>
        <h1>Select a chain</h1>
        <p css={{ marginTop: 16, textAlign: 'center' }}>Select the chain for your Multisig</p>
      </div>
      <Select value={chain.genesisHash} onValueChange={onValueChange}>
        <SelectTrigger className="w-[540px]">
          <SelectValue placeholder="Select Network" />
        </SelectTrigger>
        <SelectContent className="grid gap-[0px] py-[4px] w-[540px]" position="item-aligned">
          {mainnets.length > 0 && <Group chains={mainnets} label="Mainnets" />}
          {mainnets.length > 0 && testnets.length > 0 && <hr className="my-[12px]" />}
          {testnets.length > 0 && <Group chains={testnets} label="Testnets" />}
        </SelectContent>
      </Select>
      {augmentedAccountsLength === 0 && (
        <div>
          <div className="text-center">{`Switch to a ${chain.chainName} compatible account to create a vault on this chain`}</div>
          <AccountsList hideHeader={true} />
        </div>
      )}
      <div className="pt-[36px]">
        <CancleOrNext
          block
          cancel={{
            onClick: onBack,
            children: 'Back',
          }}
          next={{
            disabled: augmentedAccountsLength === 0,
            onClick: onNext,
          }}
        />
      </div>
    </div>
  )
}

export default SelectChain

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
}: {
  header?: string
  onNext: () => void
  onBack: () => void
  setChain: React.Dispatch<React.SetStateAction<Chain>>
  chain: Chain
  chains: Chain[]
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
    <div className="grid items-center justify-center gap-[48px] w-full max-w-[540px]">
      <div>
        <h4 className="text-[14px] text-center font-bold mb-[4px]">{header}</h4>
        <h1>Select a chain</h1>
        <p css={{ marginTop: 16, textAlign: 'center' }}>Select the chain for your Multisig</p>
      </div>
      <Select value={chain.genesisHash} onValueChange={onValueChange}>
        <SelectTrigger className="max-w-[280px]">
          <SelectValue placeholder="Select Network" />
        </SelectTrigger>
        <SelectContent className="grid gap-[0px] py-[4px]" position="item-aligned">
          {mainnets.length > 0 && <Group chains={mainnets} label="Mainnets" />}
          {mainnets.length > 0 && testnets.length > 0 && <hr className="my-[12px]" />}
          {testnets.length > 0 && <Group chains={testnets} label="Testnets" />}
        </SelectContent>
      </Select>
      <CancleOrNext
        block
        cancel={{
          onClick: onBack,
          children: 'Back',
        }}
        next={{
          onClick: onNext,
        }}
      />
    </div>
  )
}

export default SelectChain

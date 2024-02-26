import { Chain } from '@domains/chains'
import { css } from '@emotion/css'
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
import { useMemo } from 'react'

const Group = (props: { chains: Chain[]; label: string }) => (
  <SelectGroup>
    <SelectLabel>{props.label}</SelectLabel>
    {props.chains.map(chain => (
      <SelectItem value={chain.genesisHash}>
        <div className="w-full flex items-center gap-[12px]">
          <div className="w-[40px] h-[40px] min-h-[40px] min-w-[40px]">
            <img src={chain.logo} alt={chain.chainName} />
          </div>
          <p>{chain.chainName}</p>
        </div>
      </SelectItem>
    ))}
  </SelectGroup>
)

const SelectChain = (props: {
  onNext: () => void
  onBack: () => void
  setChain: React.Dispatch<React.SetStateAction<Chain>>
  chain: Chain
  chains: Chain[]
}) => {
  const mainnets = useMemo(() => props.chains.filter(chain => !chain.isTestnet), [props.chains])
  const testnets = useMemo(() => props.chains.filter(chain => chain.isTestnet), [props.chains])
  return (
    <div
      className={css`
        display: grid;
        justify-items: center;
        align-content: center;
        gap: 48px;
        width: 100%;
        max-width: 540px;
      `}
    >
      <div>
        <h1>Select a chain</h1>
        <p css={{ marginTop: 16, textAlign: 'center' }}>Select the chain for your Vault</p>
      </div>
      <Select
        value={props.chain.genesisHash}
        onValueChange={value => props.setChain(props.chains.find(chain => chain.genesisHash === value) as Chain)}
        {...props}
      >
        <SelectTrigger className="max-w-[280px]">
          <SelectValue placeholder="Select Network" />
        </SelectTrigger>
        <SelectContent className="grid gap-[16px] py-[4px]" position="item-aligned">
          {mainnets.length > 0 && <Group chains={mainnets} label="Mainnets" />}
          {mainnets.length > 0 && testnets.length > 0 && <hr className="my-[12px]" />}
          {testnets.length > 0 && <Group chains={testnets} label="Testnets" />}
        </SelectContent>
      </Select>
      <CancleOrNext
        block
        cancel={{
          onClick: props.onBack,
          children: 'Back',
        }}
        next={{
          onClick: props.onNext,
        }}
      />
    </div>
  )
}

export default SelectChain

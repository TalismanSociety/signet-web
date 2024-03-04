import { Chain } from '@domains/chains'
import { Address } from '@util/addresses'
import AddressInput from '@components/AddressInput'
import { CancleOrNext } from '../common/CancelOrNext'

type Props = {
  address?: Address
  chain: Chain
  header?: string
  onBack: () => void
  onChange: (address?: Address) => void
  onNext: () => void
}

export const ProxiedAccountSettings: React.FC<Props> = ({ address, chain, header, onBack, onChange, onNext }) => {
  return (
    <form className="grid items-center justify-center gap-[48px] w-full max-w-[540px]" onSubmit={onNext}>
      <div>
        <h4 className="text-[14px] text-center font-bold mb-[4px]">{header}</h4>
        <h1>Enter Proxied Address</h1>
        <p css={{ textAlign: 'center', marginTop: 8 }}>Enter the Proxied Account Address to import.</p>
      </div>

      <AddressInput chain={chain} defaultAddress={address} onChange={address => onChange(address)} />

      <CancleOrNext
        block
        cancel={{
          onClick: onBack,
          children: <h3>Back</h3>,
          type: 'button',
        }}
        next={{
          disabled: !address,
          onClick: onNext,
          type: 'submit',
        }}
      />
    </form>
  )
}

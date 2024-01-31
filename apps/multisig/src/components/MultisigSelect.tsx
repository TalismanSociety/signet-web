import { PlusCircle } from '@talismn/icons'
import { Select } from '@talismn/ui'
import { Multisig } from '@domains/multisig'
import { Link } from 'react-router-dom'
import { AccountDetails } from './AddressInput/AccountDetails'

type Props = {
  multisigs: Multisig[]
  selectedMultisig: Multisig
  onChange: (multisig: Multisig) => void
}

const VaultDetails: React.FC<{ multisig: Multisig; disableCopy?: boolean; selected?: boolean }> = ({
  multisig,
  selected,
}) => (
  <div className="w-full flex items-center justify-center gap-[12px] select-none">
    {/** Threshold + chain logo circle */}
    <div className="relative h-[40px] w-[40px] min-w-[40px] flex items-center justify-center">
      <div
        css={({ color }) => ({
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: color.primaryContainer,
          borderRadius: '50%',
          opacity: selected ? 1 : 0.4,
        })}
      />
      <img
        css={{ top: -2, right: -2, position: 'absolute', height: 14 }}
        src={multisig.chain.logo}
        alt={multisig.chain.chainName}
      />
      <p
        css={({ color }) => ({
          color: color.primary,
          fontWeight: 700,
          fontSize: 12,
          marginTop: 4,
          opacity: selected ? 1 : 0.6,
        })}
      >
        {multisig.threshold}/{multisig.signers.length}
      </p>
    </div>

    {selected && (
      <AccountDetails
        name={multisig.name}
        address={multisig.proxyAddress}
        chain={multisig.chain}
        breakLine
        hideIdenticon
      />
    )}
  </div>
)

const AddVaultButton: React.FC = () => (
  <Link to="/add-vault">
    <div
      css={({ color }) => ({
        'border': 'none',
        'display': 'flex',
        'alignItems': 'center',
        'gap': 8,
        'padding': '8px 16px',
        'marginBottom': 8,
        'backgroundColor': color.surface,
        ':hover': { filter: 'brightness(1.2)' },
        'cursor': 'pointer',
        'width': '100%',
        'svg': { color: color.primary },
      })}
    >
      <PlusCircle size={32} />
      <p css={{ marginTop: 4, fontSize: 16, textAlign: 'left' }}>Add Vault</p>
    </div>
  </Link>
)

export const MultisigSelect: React.FC<Props> = ({ multisigs, onChange, selectedMultisig }) => {
  const handleChange = (value: string) => {
    const newMultisig = multisigs.find(m => m.id === value)
    if (newMultisig) onChange(newMultisig)
  }
  return (
    <Select
      afterOptionsNode={<AddVaultButton />}
      css={{
        button: {
          'gap': 8,
          'width': 240,
          'overflowX': 'hidden',
          '>div': {
            flex: 1,
            width: 181, // doesnt matter, only so that flex: 1 works
          },
          '>svg': {
            minWidth: '24px',
          },
        },
      }}
      onChange={handleChange}
      placeholder={<VaultDetails multisig={selectedMultisig} selected />}
      placeholderPointerEvents
      value={selectedMultisig.id}
    >
      {multisigs.reduce((accumulator, multisig) => {
        if (selectedMultisig.id === multisig.id) return accumulator

        return accumulator.concat(
          <Select.Option
            key={multisig.id}
            value={multisig.id}
            leadingIcon={<VaultDetails multisig={multisig} />}
            headlineText={
              <div className="w-full max-w-[157px]">
                <AccountDetails
                  name={multisig.name}
                  address={multisig.proxyAddress}
                  chain={multisig.chain}
                  breakLine
                  hideIdenticon
                />
              </div>
            }
          />
        )
      }, [] as any)}
    </Select>
  )
}

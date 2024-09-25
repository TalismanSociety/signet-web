import { Transaction } from '@domains/offchain-data/metadata/types'
import { useMemo } from 'react'
import { hexToU8a, compactAddLength, BN_ZERO } from '@polkadot/util'
import { StatusMessage } from '@components/StatusMessage'
import { useApi } from '@domains/chains/pjs-api'
import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { cn } from '@util/tailwindcss'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { Address } from '@util/addresses'
import { useTokenByChain } from '@domains/balances/useTokenByChain'
import { Skeleton } from '@talismn/ui'
import { formatBalance } from '@polkadot/util'

const Row: React.FC<React.PropsWithChildren & { label: string; className?: string }> = ({
  label,
  children,
  className,
}) => (
  <div className="w-full">
    <p className="mb-[4px]">{label}</p>
    <div className={cn('w-full bg-gray-800 p-[16px] py-[12px] rounded-[8px]', className)}>{children}</div>
  </div>
)

const IS_ADDRESS: Record<string, boolean> = {
  AccountId: true,
  Address: true,
  LookupSource: true,
  MultiAddress: true,
}

export const DeployContractExpandedDetails: React.FC<{ t: Transaction }> = ({ t }) => {
  const { api } = useApi(t.multisig.chain.genesisHash)
  const { decimal, symbol } = useTokenByChain(t.multisig.chain.genesisHash)
  const { contactByAddress } = useKnownAddresses(t.multisig.orgId, {
    includeContracts: true,
    includeSelectedMultisig: true,
  })

  const contractDeployment = useMemo(() => t.decoded?.contractDeployment, [t.decoded?.contractDeployment])

  const decodedConstructor = useMemo(() => {
    if (!contractDeployment) return undefined
    try {
      return contractDeployment.abi.decodeConstructor(compactAddLength(hexToU8a(contractDeployment.data)))
    } catch (e) {
      console.error('Failed to decode contract call:', e)
      return undefined
    }
  }, [contractDeployment])

  if (!api)
    return (
      <div className="w-full">
        <StatusMessage type="loading" message="Loading smart contract..." />
      </div>
    )

  return (
    <div className="w-full grid gap-[16px]">
      <Row label="Contract Name">
        <p>{contractDeployment?.name}</p>
      </Row>
      <Row label="Constructor">
        <p>{decodedConstructor?.message.method}</p>
      </Row>
      {t.decoded?.contractDeployment?.value.gt(BN_ZERO) && (
        <Row label="Payable">
          {decimal === undefined ? (
            <Skeleton.Surface className="h-[20px] w-[80px]" />
          ) : (
            <p>
              {formatBalance(t.decoded.contractDeployment.value, {
                decimals: decimal.toNumber(),
                withUnit: false,
              })}{' '}
              {symbol?.toUpperCase()}
            </p>
          )}
        </Row>
      )}
      <div className="w-full grid gap-[4px]">
        <p>Constructor Parameters</p>
        <div className="p-[12px] grid gap-[12px] border border-gray-500 rounded-[8px]">
          {decodedConstructor?.args.map((val, index) => {
            const arg = decodedConstructor?.message.args[index]
            if (!arg) return null // impossible

            if (IS_ADDRESS[arg.type.type]) {
              const address = Address.fromSs58(val.toString())
              if (address)
                return (
                  <Row key={index} label={arg.name}>
                    <AccountDetails
                      address={address}
                      name={contactByAddress?.[address.toSs58()]?.name}
                      withAddressTooltip
                    />
                  </Row>
                )
            }
            return (
              <Row key={index} label={arg.name}>
                <p className="break-all">{val.toString()}</p>
              </Row>
            )
          })}
        </div>
      </div>
    </div>
  )
}

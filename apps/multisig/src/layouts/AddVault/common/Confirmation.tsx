import { Loadable, useRecoilValue } from 'recoil'
import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { css } from '@emotion/css'
import { isEqual } from 'lodash'

import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { ChainPill } from '@components/ChainPill'
import { BaseToken, Chain, Price } from '@domains/chains'
import {
  AugmentedAccount,
  Balance,
  ProxyDefinition,
  activeMultisigsState,
  useSelectedMultisig,
} from '@domains/multisig'
import { useProxies } from '@domains/proxy/useProxies'
import { Address, toMultisigAddress } from '@util/addresses'
import { balanceToFloat, formatUsd } from '@util/numbers'
import { secondsToDuration } from '@util/misc'

import { Info } from '@talismn/icons'
import { CircularProgressIndicator, IconButton } from '@talismn/ui'
import { Skeleton } from '@talismn/ui'
import { CancleOrNext } from './CancelOrNext'
import { device } from '@util/breakpoints'
import { Tooltip } from '@components/ui/tooltip'
import { InfoIcon } from 'lucide-react'
import { MIN_MULTISIG_MEMBERS } from '@util/constants'

const NameAndSummary: React.FC<{ name: string; chain: Chain; proxiedAccount?: Address }> = ({
  name,
  chain,
  proxiedAccount,
}) => (
  <div
    css={{
      display: 'grid',
      width: '100%',
      background: 'var(--color-controlBackground)',
      padding: '24px 16px',
      borderRadius: 16,
      gap: 4,
    }}
  >
    <div css={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h2 css={({ color }) => ({ color: color.offWhite })}>{name}</h2>
      <ChainPill chain={chain} />
    </div>
    {proxiedAccount ? (
      <div css={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <p>Import proxied account</p>
        <div
          css={({ color }) => ({
            p: { fontSize: 14 },
            padding: '2px 6px',
            backgroundColor: color.surface,
            borderRadius: 8,
          })}
        >
          <AccountDetails identiconSize={20} address={proxiedAccount} chain={chain} />
        </div>
      </div>
    ) : (
      <p css={({ color }) => ({ span: { color: color.offWhite } })}>
        Create new <span>Pure Proxied Account</span>
      </p>
    )}
  </div>
)

const Members: React.FC<{ members: AugmentedAccount[]; chain: Chain }> = ({ members, chain }) => (
  <div css={{ display: 'grid', gap: 12 }}>
    <p>Members</p>
    <div css={{ display: 'grid', gap: 8 }}>
      {members.map(account => (
        <div key={account.address.toPubKey()} className="w-full bg-gray-700 p-[12px] rounded-[12px]">
          <AccountDetails
            address={account.address}
            name={account.nickname}
            chain={chain}
            breakLine
            identiconSize={32}
            withAddressTooltip
          />
        </div>
      ))}
    </div>
  </div>
)

const Threshold: React.FC<{ threshold: number; membersCount: number }> = ({ threshold, membersCount }) => (
  <div css={{ display: 'grid', gap: 12 }}>
    <p>Threshold</p>
    <p css={({ color }) => ({ color: color.offWhite })}>
      {threshold} of {membersCount} Members
    </p>
  </div>
)

const MultisigAddress: React.FC<{ address: Address; chain: Chain }> = ({ address, chain }) => (
  <div css={{ display: 'grid', gap: 12 }}>
    <div className="flex items-center gap-[8px]">
      <p>Multisig Address</p>
      <Tooltip content="The multisig address is derived from your members and threshold.">
        <InfoIcon size={16} />
      </Tooltip>
    </div>
    <div className="w-max">
      <AccountDetails address={address} chain={chain} withAddressTooltip />
    </div>
  </div>
)

const ProxyTypes: React.FC<{ proxies?: ProxyDefinition[] }> = ({ proxies }) => (
  <div>
    <div css={{ display: 'flex', alignItems: 'center', p: { width: '100%' } }}>
      <p>Proxy Types</p>
      <p>Time Delay</p>
    </div>
    <div css={({ color }) => ({ p: { color: color.offWhite, span: { color: color.lightGrey } }, marginTop: 12 })}>
      {proxies ? (
        proxies.length === 0 ? (
          <p>The multisig is not a proxy of the imported proxied address.</p>
        ) : (
          <div css={{ display: 'grid', gap: 8 }}>
            {proxies.map(proxy => (
              <div key={`${proxy.proxyType}_${proxy.delay}`} css={{ display: 'flex', p: { width: '100%' } }}>
                <p>{proxy.proxyType}</p>
                <p>
                  {proxy.delay} blocks <span>≈{secondsToDuration(proxy.duration)}</span>
                </p>
              </div>
            ))}
          </div>
        )
      ) : (
        <CircularProgressIndicator size={16} />
      )}
    </div>
  </div>
)

export const ImportedProxiesTypes: React.FC<{
  chain: Chain
  multisigAddress: Address
  proxiedAddress: Address
  onProxies: (proxies?: ProxyDefinition[]) => void
}> = ({ chain, multisigAddress, proxiedAddress, onProxies }) => {
  const { proxies } = useProxies(proxiedAddress, chain)

  const filteredProxies = proxies?.filter(({ delegate }) => delegate.isEqual(multisigAddress))

  useEffect(() => {
    onProxies(filteredProxies)
  }, [filteredProxies, onProxies])

  return <ProxyTypes proxies={filteredProxies} />
}

const Cost = ({
  amount,
  symbol,
  price,
  label,
}: {
  amount?: Balance
  symbol?: string
  price?: number
  label: string
}) => (
  <div css={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
    <p>{label}</p>
    {amount !== undefined && symbol !== undefined && price !== undefined ? (
      <p>
        {balanceToFloat(amount) < 0.000001 ? '< 0.0000001' : balanceToFloat(amount).toFixed(6)} {symbol} (
        {formatUsd(balanceToFloat(amount) * price)})
      </p>
    ) : (
      <Skeleton.Surface css={{ height: 14, minWidth: 125 }} />
    )}
  </div>
)

const Confirmation = (props: {
  onBack: () => void
  onCreateVault: () => void
  header?: string
  selectedAccounts: AugmentedAccount[]
  proxiedAccount?: Address
  threshold: number
  name: string
  chain: Chain
  tokenWithPrice?: Loadable<{ token: BaseToken; price: Price }>
  reserveAmount?: Loadable<Balance>
  existentialDeposit?: Loadable<Balance>
  estimatedFee?: Balance | undefined
  extrinsicsReady?: boolean
  importing?: boolean
}) => {
  const navigate = useNavigate()

  const { tokenWithPrice, reserveAmount, estimatedFee, chain, existentialDeposit } = props
  const activeMultisigs = useRecoilValue(activeMultisigsState)
  const [, setSelectedMultisig] = useSelectedMultisig()

  const multisigAddress = toMultisigAddress(
    props.selectedAccounts.map(a => a.address),
    props.threshold
  )

  // Note: this is only updated in import multisig flow
  const [proxies, setProxies] = React.useState<ProxyDefinition[] | undefined>([
    {
      proxyType: 'Any',
      delay: 0,
      duration: 0,
      delegate: multisigAddress,
    },
  ])
  const vaultExists = useMemo(() => {
    if (!props.proxiedAccount) return undefined

    for (const multisig of activeMultisigs) {
      if (
        multisig.proxyAddress?.isEqual(props.proxiedAccount) &&
        multisig.multisigAddress.isEqual(multisigAddress) &&
        multisig.chain.chainName === props.chain.chainName
      )
        return multisig
    }
    return undefined
  }, [activeMultisigs, multisigAddress, props.chain.chainName, props.proxiedAccount])

  const goToExistingVault = () => {
    if (!vaultExists) return
    setSelectedMultisig(vaultExists)
    navigate('/overview')
  }

  return (
    <div className="grid justify-center items-center gap-[32px] max-w-[620px] w-full">
      <div>
        <h4 className="text-[14px] text-center font-bold mb-[4px]">{props.header}</h4>
        <h1>Confirmation</h1>
        <p css={{ textAlign: 'center', marginTop: 16 }}>Please review and confirm details before proceeding.</p>
      </div>
      <NameAndSummary name={props.name} chain={chain} proxiedAccount={props.proxiedAccount} />

      {/** Multisig config summary */}
      <div
        css={{
          display: 'grid',
          background: ' var(--color-controlBackground)',
          gap: 16,
          padding: '24px 16px',
          borderRadius: 16,
          width: '100%',
        }}
      >
        <h2 css={({ color }) => ({ color: color.offWhite, fontSize: 16 })}>Vault Config</h2>
        <div
          className={css`
            display: grid;
            gap: 32px;
            grid-template-columns: 1fr;
            align-items: flex-start;
            @media ${device.md} {
              gap: 24px;
              grid-template-columns: 1fr 1fr;
            }
          `}
        >
          <Members members={props.selectedAccounts} chain={props.chain} />
          <div css={{ display: 'grid', gap: 24 }}>
            <Threshold threshold={props.threshold} membersCount={props.selectedAccounts.length} />

            <MultisigAddress address={multisigAddress} chain={chain} />
            {props.proxiedAccount ? (
              <ImportedProxiesTypes
                chain={props.chain}
                multisigAddress={multisigAddress}
                proxiedAddress={props.proxiedAccount}
                onProxies={newProxies => {
                  if (isEqual(newProxies, proxies)) return
                  setProxies(newProxies)
                }}
              />
            ) : (
              <ProxyTypes proxies={proxies} />
            )}
          </div>
        </div>
      </div>

      {/** Information for create multisig flow */}
      {!props.proxiedAccount && (
        <div
          className={css`
            display: flex;
            align-items: center;
            background: var(--color-controlBackground);
            border-radius: 16px;
            padding: 16px;
            width: 100%;
            gap: 16px;
          `}
        >
          <IconButton size="54px" contentColor={'#d5ff5c'}>
            <Info size={54} />
          </IconButton>
          <p>
            To operate your multisig, {chain.chainName} requires some funds to be reserved as a deposit. This will be
            fully refunded when you wind down your multisig.
          </p>
        </div>
      )}

      {/** Importing multisig off-chain, dont need gas fee/reserved amounts */}
      {!props.proxiedAccount && (
        <div css={{ width: '100%' }}>
          <Cost
            label="Reserved Amount"
            amount={reserveAmount?.state === 'hasValue' ? reserveAmount.contents : undefined}
            symbol={tokenWithPrice?.contents?.token?.symbol}
            price={tokenWithPrice?.contents?.price?.current}
          />
          <Cost
            label="Initial Multisig Funds"
            amount={existentialDeposit?.state === 'hasValue' ? existentialDeposit.contents : undefined}
            symbol={tokenWithPrice?.contents?.token?.symbol}
            price={tokenWithPrice?.contents?.price?.current}
          />
          <Cost
            label="Estimated Transaction Fee"
            amount={estimatedFee}
            symbol={tokenWithPrice?.contents?.token?.symbol}
            price={tokenWithPrice?.contents?.price?.current}
          />
        </div>
      )}

      <div css={{ width: '100%' }}>
        {props.proxiedAccount && vaultExists && (
          <p
            css={({ color }) => ({
              textAlign: 'center',
              fontSize: 14,
              color: color.lightGrey,
              marginBottom: 16,
              span: {
                'fontWeight': 700,
                'color': color.offWhite,
                'cursor': 'pointer',
                'whiteSpace': 'nowrap',
                ':hover': {
                  opacity: 0.7,
                },
              },
            })}
          >
            The Multisig has already been created as <span onClick={goToExistingVault}>{vaultExists.name}</span>
          </p>
        )}
        {/** Trying to import a multisig unit that does not have any proxy relationship */}
        {proxies?.length === 0 && props.proxiedAccount !== undefined && (
          <p
            css={({ color }) => ({
              textAlign: 'center',
              fontSize: 14,
              color: color.error,
              marginBottom: 16,
            })}
          >
            Please make sure your multisig is a proxy of the imported proxied address.
          </p>
        )}

        <CancleOrNext
          block
          cancel={{
            onClick: props.onBack,
            children: 'Back',
          }}
          next={{
            children: props.proxiedAccount ? (vaultExists ? 'Go to Multisig' : 'Import Multisig') : 'Create Multisig',
            onClick: vaultExists ? goToExistingVault : props.onCreateVault,
            disabled:
              (tokenWithPrice && tokenWithPrice.state !== 'hasValue') ||
              props.selectedAccounts.length < MIN_MULTISIG_MEMBERS ||
              props.extrinsicsReady === false ||
              !proxies ||
              proxies?.length === 0,
            loading: props.importing,
          }}
        />
      </div>
    </div>
  )
}

export default Confirmation

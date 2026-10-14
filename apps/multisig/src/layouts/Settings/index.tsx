import { SettingsInfoRow } from './InfoRow'
import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { useSelectedMultisig } from '@domains/multisig'
import { ChainPill } from '@components/ChainPill'
import { SignersSettings } from './SignersSettings'
import { useEffect, useMemo, useState } from 'react'
import { ThresholdSettings } from './ThresholdSettings'
import { pjsApiSelector } from '@domains/chains/pjs-api'
import { useRecoilValueLoadable } from 'recoil'
import { toMultisigAddress } from '@util/addresses'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { ProxiesSettings } from './ProxiesSettings'
import { TransactionSidesheet } from '@components/TransactionSidesheet'
import { useToast } from '@components/ui/use-toast'
import { ExternalLink } from 'lucide-react'
import { AlertCircle } from '@talismn/icons'
import { Button } from '@components/ui/button'
import { useUser } from '@domains/auth'
import { NameForm } from './NameForm'
import { DescriptionForm } from './DescriptionForm'
import { RecoverMultisig } from './RecoverMultisig'
import { MIN_MULTISIG_MEMBERS, MIN_MULTISIG_THRESHOLD } from '@util/constants'
import { useProxyDepositRequirement } from '@domains/proxy/useProxyDepositRequirement'
import { useSystemToken } from '@domains/chains/tokens'
import { formatUnits } from '@util/numbers'

const Settings = () => {
  const [multisig] = useSelectedMultisig()
  const [newMembers, setNewMembers] = useState(multisig.signers)
  const [newThreshold, setNewThreshold] = useState(multisig.threshold)
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(multisig.chain.genesisHash))
  const [extrinsic, setExtrinsic] = useState<SubmittableExtrinsic<'promise'> | undefined>()
  const { isSigner } = useUser()
  const newMultisigAddress = toMultisigAddress(newMembers, newThreshold)
  const hasAny = multisig.proxies?.find(p => p.proxyType === 'Any') !== undefined
  const { toast } = useToast()
  const api = apiLoadable.state === 'hasValue' ? apiLoadable.contents : undefined
  const systemToken = useSystemToken(api)
  const { requirement: proxyDeposit } = useProxyDepositRequirement(api, multisig.proxyAddress)
  const insufficientProxyDeposit = proxyDeposit !== undefined && !proxyDeposit.sufficient

  const changed = useMemo(() => {
    return !newMultisigAddress.isEqual(multisig.multisigAddress)
  }, [multisig.multisigAddress, newMultisigAddress])

  const handleReset = () => {
    setNewMembers(multisig.signers)
    setNewThreshold(multisig.threshold)
    setExtrinsic(undefined)
  }

  const handleApplyChanges = () => {
    if (apiLoadable.state !== 'hasValue') return
    const api = apiLoadable.contents
    if (!api.tx.proxy?.addProxy || !api.tx.proxy.removeProxy || !api.tx.proxy.proxy || !api.tx.utility?.batchAll) {
      throw Error('chain doesnt have proxy or utility pallet')
    }
    if (insufficientProxyDeposit) {
      console.error('[Settings] proxied account cannot cover proxy deposit', proxyDeposit)
      return toast({
        title: 'Insufficient balance in proxied account',
        description: 'The proxied account needs more free balance to reserve the proxy deposit.',
      })
    }
    const batchCall = api.tx.utility.batchAll([
      api.tx.proxy.addProxy(newMultisigAddress.bytes, 'Any', 0),
      api.tx.proxy.removeProxy(multisig.multisigAddress.bytes, 'Any', 0),
    ])
    setExtrinsic(batchCall)
  }

  useEffect(() => {
    setNewMembers(multisig.signers)
    setNewThreshold(multisig.threshold)
  }, [multisig.signers, multisig.threshold])

  return (
    <>
      <div className="flex flex-1 p-[16px] lg:py-[32px] lg:px-[4%] flex-col gap-[32px]">
        <div className="flex items-center justify-between gap-[12px]">
          <h2 className="text-offWhite mt-[4px] font-bold">Multisig Settings</h2>
        </div>
        <div className="grid gap-[32px] grid-cols-1 md:grid-cols-2">
          {/** first row: Name */}
          <div className="flex gap-4 justify-between">
            <NameForm name={multisig.name} editable={isSigner} teamId={multisig.id} />
            <DescriptionForm description={multisig.description} editable={isSigner} teamId={multisig.id} />
          </div>
          <div className="hidden md:block" />

          {/** second row: Proxied Account | Chain */}
          <SettingsInfoRow
            label="Proxied Account"
            tooltip="This is the account the Multisig controls, typically where funds are stored"
          >
            <AccountDetails address={multisig.proxyAddress} chain={multisig.chain} withAddressTooltip />
          </SettingsInfoRow>
          <SettingsInfoRow label="Chain">
            <ChainPill chain={multisig.chain} />
          </SettingsInfoRow>

          {multisig.proxies?.length === 0 && (
            <div className="grid md:col-span-2">
              <RecoverMultisig multisig={multisig} />
            </div>
          )}

          {/** third row: Multisig Address */}
          <SettingsInfoRow
            label="Multisig Address"
            tooltip="This multisig address is the address that controls the proxied account. It is derived from your multisig's members and threshold. Do not transfer funds to
            this address."
            tooltipType="warning"
            labelClassName={multisig.proxies?.length === 0 ? 'text-red-500' : ''}
          >
            <AccountDetails address={newMultisigAddress} chain={multisig.chain} withAddressTooltip />
          </SettingsInfoRow>
          <div className="hidden md:block" />

          {/** forth row: Signers settings | other settings */}
          <SignersSettings
            members={newMembers}
            onChange={setNewMembers}
            multisig={multisig}
            editable={hasAny}
            error={multisig.proxies?.length === 0}
          />
          <div css={{ display: 'flex', gap: 24, flexDirection: 'column' }}>
            <ThresholdSettings
              membersCount={newMembers.length}
              threshold={newThreshold}
              onChange={setNewThreshold}
              disabled={!hasAny}
              error={multisig.proxies?.length === 0}
            />
            <ProxiesSettings proxies={multisig.proxies} />
          </div>
        </div>
        {hasAny && changed && insufficientProxyDeposit && proxyDeposit && (
          <div className="bg-gray-800 w-full rounded-[12px] p-[16px] mt-[32px] text-offWhite flex items-start gap-[12px]">
            <AlertCircle size={24} className="text-orange-400 min-w-[24px]" />
            <p>
              <span className="font-bold">Insufficient balance in proxied account.</span> Changing the signer
              configuration adds a new proxy to the proxied account, which reserves a proxy deposit from the proxied
              account itself. It needs at least{' '}
              <span className="font-bold">
                {formatUnits(proxyDeposit.required, systemToken?.tokenDecimals ?? 0)} {systemToken?.tokenSymbol}
              </span>{' '}
              free but currently has{' '}
              <span className="font-bold">
                {formatUnits(proxyDeposit.free, systemToken?.tokenDecimals ?? 0)} {systemToken?.tokenSymbol}
              </span>
              . Top up the proxied account and try again.
            </p>
          </div>
        )}
        {hasAny || !multisig.allProxies ? (
          <div
            css={{
              width: '100%',
              display: 'flex',
              gap: 24,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 32,
              button: { height: 56 },
            }}
          >
            <Button disabled={!changed} variant="secondary" onClick={handleReset}>
              Reset
            </Button>
            <Button
              disabled={
                !changed ||
                insufficientProxyDeposit ||
                apiLoadable.state !== 'hasValue' ||
                newMembers.length < MIN_MULTISIG_MEMBERS ||
                newThreshold < MIN_MULTISIG_THRESHOLD
              }
              loading={changed && apiLoadable.state === 'loading'}
              onClick={handleApplyChanges}
            >
              Review
            </Button>
          </div>
        ) : multisig.proxies?.length === 0 ? null : (
          <div
            css={({ color }) => ({
              backgroundColor: color.surface,
              color: color.offWhite,
              padding: 16,
              borderRadius: 12,
              span: {
                fontWeight: 800,
              },
              a: { color: color.primary },
            })}
          >
            <p>
              On-chain configurations cannot be changed because <span>{multisig.name}</span> does not have{' '}
              <span>Any proxy type</span> to the proxied account.{' '}
              <a
                href="https://wiki.polkadot.network/docs/learn-proxies"
                target="_blank"
                rel="noreferrer"
                className="inline-flex gap-[4px]"
              >
                Learn More{' '}
                <span>
                  <ExternalLink size={16} />
                </span>
              </a>
            </p>
          </div>
        )}
      </div>
      {extrinsic && (
        <TransactionSidesheet
          calldata={extrinsic.method.toHex()}
          description="Change Signer Configuration"
          open={extrinsic !== undefined}
          onClose={() => setExtrinsic(undefined)}
          otherTxMetadata={{
            changeConfigDetails: {
              newMembers,
              newThreshold,
            },
          }}
          onApproveFailed={e => {
            console.error(e)
            toast({
              title: 'Transaction failed',
              description: e.message,
            })
          }}
        />
      )}
    </>
  )
}
export default Settings

import Modal from '@components/Modal'
import { Button } from '@components/ui/button'
import { ChevronLeft, ChevronRight, Info, Stars, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SignersSettings } from './SignersSettings'
import { ThresholdSettings } from './ThresholdSettings'
import { useRecoilValueLoadable } from 'recoil'
import { vaultsOfAccount } from '@domains/multisig/vaults-scanner'
import { CircularProgressIndicator } from '@talismn/ui'
import { MultisigWithExtraData } from '@domains/multisig'
import { Address, toMultisigAddress } from '@util/addresses'
import StatusCircle, { StatusCircleType } from '@components/StatusCircle'
import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { Chain } from '@domains/chains'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { useUpdateMultisigConfig } from '@domains/offchain-data'
import { useUser } from '@domains/auth'
import { ProxiesSettings } from './ProxiesSettings'
import { SettingsInfoRow } from './InfoRow'

type Props = {
  multisig: MultisigWithExtraData
}

const ScannedMultisigs: React.FC<{
  multisigs: { signers: Address[]; threshold: number; address: Address }[]
  chain: Chain
  orgId: string
  onSelect: (multisig: { signers: Address[]; threshold: number; address: Address }) => void
}> = ({ chain, multisigs, onSelect, orgId }) => {
  const signersAddresses = useMemo(() => multisigs.flatMap(m => m.signers.map(signer => signer.toSs58())), [multisigs])
  const { contactByAddress, isLoading } = useKnownAddresses({ orgId, addresses: signersAddresses })
  return (
    <div className="grid gap-[8px] max-h-[400px] overflow-y-auto">
      {multisigs.map(multisig => (
        <div
          key={multisig.address.toSs58()}
          className="p-[12px] w-full rounded-[12px] gap-[8px] flex flex-col border border-gray-700 "
        >
          <div className="w-full grid grid-cols-2 items-center flex-1 gap-[8px]">
            <div className="flex flex-1 w-full flex-col">
              <p className="text-[14px] mb-[4px]">Multisig Address</p>
              <AccountDetails
                address={multisig.address}
                chain={chain}
                nameOrAddressOnly
                withAddressTooltip
                disableCopy
              />
            </div>

            <div className="pr-[12px]">
              <p className="text-[14px] mb-[4px]">Threshold</p>
              <p className="text-offWhite font-bold">
                {multisig.threshold} of {multisig.signers.length}
              </p>
            </div>
          </div>
          <div className="w-full">
            <p className="text-[14px] mt-[12px] mb-[4px]">Signers</p>
            <div className="grid grid-cols-2 gap-[12px] w-full max-h-[110px] overflow-y-auto">
              {multisig.signers.map(signer => (
                <div key={signer.toSs58()}>
                  <AccountDetails
                    address={signer}
                    chain={chain}
                    name={contactByAddress[signer.toSs58()]?.name}
                    withAddressTooltip
                    nameOrAddressOnly
                    isNameLoading={isLoading}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-[12px]">
            <Button onClick={() => onSelect(multisig)} size="lg">
              Use Multisig
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export const RecoverMultisig: React.FC<Props> = ({ multisig }) => {
  const scanned = useRecoilValueLoadable(vaultsOfAccount)
  const [open, setOpen] = useState(false)
  const [newSigners, setNewSigners] = useState(multisig.signers)
  const [newThreshold, setNewThreshold] = useState(multisig.threshold)
  const [useScanned, setUseScanned] = useState(false)
  const { updateMultisigConfig, loading } = useUpdateMultisigConfig()
  const { user, isSigner } = useUser()

  useEffect(() => {
    if (!open) {
      setNewSigners(multisig.signers)
      setNewThreshold(multisig.threshold)
      setUseScanned(false)
    }
  }, [open, multisig.signers, multisig.threshold])

  const multisigAddress = useMemo(() => toMultisigAddress(newSigners, newThreshold), [newSigners, newThreshold])

  const changed = useMemo(() => {
    return !multisigAddress.isEqual(multisig.multisigAddress)
  }, [multisig.multisigAddress, multisigAddress])

  const proxy = useMemo(
    () => multisig.allProxies?.find(proxy => proxy.delegate.isEqual(multisigAddress)),
    [multisig.allProxies, multisigAddress]
  )

  const applicableMultisigs = useMemo(() => {
    if (scanned.state !== 'hasValue') return []
    return (
      Object.values(scanned.contents?.multisigs ?? {}).filter(
        m =>
          multisig.allProxies?.find(p => p.delegate.isEqual(m.multisigAddress)) !== undefined &&
          !m.multisigAddress.isEqual(multisigAddress)
      ) ?? []
    )
  }, [scanned.state, scanned.contents?.multisigs, multisig.allProxies, multisigAddress])

  const validationError = useMemo(() => {
    const userIsSigner = user && newSigners.some(signer => signer.isEqual(user.injected.address))
    if (!userIsSigner) return 'You must be a signer of the multisig'
    if (newSigners.length < 2) return 'At least 2 signers are required'
    if (newThreshold < 2) return 'Threshold must be at least 2'
    if (!proxy) return 'Multisig is not a proxy'
    return null
  }, [newSigners, newThreshold, proxy, user])

  const handleSave = useCallback(async () => {
    const updated = await updateMultisigConfig({
      id: multisig.id,
      orgId: multisig.orgId,
      signers: newSigners,
      threshold: newThreshold,
    })
    if (updated) setOpen(false)
  }, [multisig.id, multisig.orgId, newSigners, newThreshold, updateMultisigConfig])

  return (
    <>
      <div className="border border-gray-500 text-offWhite p-[16px] pb-[20px] rounded-[12px]">
        <div className="flex items-center justify-start gap-[8px]">
          <Info size={24} className="rotate-180" />
          <h4 className="font-bold text-[16px]">Action Required</h4>
        </div>
        <p className="mt-[4px] ml-[32px] text-gray-200">
          Your Multisig's settings are out of sync, the multisig address no longer has on-chain control for{' '}
          <span className="text-offWhite">{multisig.proxyAddress.toShortSs58(multisig.chain)}</span>. This can happen if
          the Multisig configuration was changed outside of Signet.
          {isSigner && ' Click to edit the offchain Multisig details and get the Multisig settings back in sync.'}
        </p>
        {isSigner ? (
          <Button className="ml-[32px] mt-[12px]" size="lg" onClick={() => setOpen(true)}>
            Reconfigure Multisig
          </Button>
        ) : (
          <p className="ml-[32px] mt-[12px]">Please contact a signer to reconfigure the multisig.</p>
        )}
      </div>

      <Modal isOpen={open} width="100%" maxWidth={800} className="!overflow-visible">
        <div className="grid w-full gap-[16px] overflow-y-auto h-full max-h-[calc(100vh-120px)] md:max-h-none md:overflow-y-visible">
          <div className="flex items-center justify-between">
            {useScanned && applicableMultisigs.length > 0 && (
              <Button size="lg" variant="secondary" className="w-max pl-[4px]" onClick={() => setUseScanned(false)}>
                <ChevronLeft size={16} /> <span className="mt-[2px]">Back</span>
              </Button>
            )}
            <h1 css={{ fontSize: 20, fontWeight: 700 }}>Reconfigure Multisig</h1>
            <div className="w-[65px] flex justify-end">
              <Button onClick={() => setOpen(false)} size="icon" variant="secondary">
                <X size={16} />
              </Button>
            </div>
          </div>
          {useScanned && applicableMultisigs.length > 0 ? (
            <div className="grid w-full gap-[12px]">
              {applicableMultisigs.length > 1 && (
                <p className="text-[14px]">Please select a multisig to be used for this recovery.</p>
              )}
              <ScannedMultisigs
                chain={multisig.chain}
                orgId={multisig.id}
                multisigs={applicableMultisigs.map(({ multisigAddress, signers, threshold }) => ({
                  address: multisigAddress,
                  signers,
                  threshold,
                }))}
                onSelect={({ signers, threshold }) => {
                  setNewSigners(signers)
                  setNewThreshold(threshold)
                  setUseScanned(false)
                }}
              />
            </div>
          ) : (
            <>
              {/** Scan multisigs for quicker import */}
              {scanned.state === 'loading' ? (
                <div className="flex items-center gap-[12px] p-[12px] py-[8px] rounded-[12px] bg-gray-800">
                  <CircularProgressIndicator size={16} />
                  <p className="text-[14px] mt-[3px]">Scanning for applicable multisig configuration...</p>
                </div>
              ) : applicableMultisigs.length > 0 ? (
                <div
                  className="flex items-center gap-[8px] p-[12px] bg-gray-600 rounded-[12px] cursor-pointer hover:bg-gray-500"
                  onClick={() => setUseScanned(true)}
                >
                  <div className="flex items-center justify-start gap-[8px]">
                    <Stars size={20} className="text-primary min-w-[20px]" />
                    <p className="text-[14px] mt-[3px] text-offWhite">
                      Found <span className="text-primary">{applicableMultisigs.length} multisigs</span> that could be
                      applied.
                    </p>
                  </div>
                  <ChevronRight className="ml-auto text-offWhite" />
                </div>
              ) : null}

              {/** Members, threshold, buttons */}
              <div className="w-full grid gap-[16px] ">
                <div className="grid md:grid-cols-2 gap-[16px]">
                  <SettingsInfoRow
                    label="Multisig Address"
                    tooltip="This multisig address is the address that controls the proxied account. It is derived from your multisig's members and threshold."
                    labelClassName="text-offWhite"
                  >
                    <AccountDetails address={multisigAddress} chain={multisig.chain} withAddressTooltip />
                  </SettingsInfoRow>
                  <div className="hidden md:block" />

                  <SignersSettings
                    capHeight
                    members={newSigners}
                    multisig={multisig}
                    editable={!loading}
                    onChange={setNewSigners}
                  />
                  <div css={{ display: 'flex', gap: 24, flexDirection: 'column' }}>
                    <ThresholdSettings
                      membersCount={newSigners.length}
                      threshold={newThreshold}
                      onChange={setNewThreshold}
                      disabled={!newSigners.length || loading}
                    />
                    <ProxiesSettings proxies={proxy ? [proxy] : []} />
                    {changed && multisig.proxies ? (
                      validationError || !proxy ? (
                        <div className="flex items-center gap-[8px] border rounded-[12px] border-gray-600 p-[12px]">
                          <StatusCircle type={StatusCircleType.Error} />
                          <p className="text-[14px] mt-[3px]">{validationError}</p>
                        </div>
                      ) : proxy.duration === 0 ? (
                        <div className="flex items-center gap-[8px] border rounded-[12px] border-gray-600 p-[12px]">
                          <StatusCircle type={StatusCircleType.Success} />
                          <p className="text-[14px] mt-[3px]">
                            Found <span className="text-offWhite">{proxy?.proxyType}</span> proxy for multisig!
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-[8px] border rounded-[12px] border-gray-600 p-[12px]">
                          <StatusCircle type={StatusCircleType.Error} />
                          <p className="text-[14px] mt-[3px]">
                            Found <span className="text-offWhite">{proxy?.proxyType}</span> proxy, but delay isn't
                            supported at the moment.
                          </p>
                        </div>
                      )
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-[8px] w-full">
                  <Button className="w-full" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button
                    className="w-full"
                    disabled={!proxy || proxy.duration !== 0 || loading}
                    loading={loading}
                    onClick={handleSave}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  )
}

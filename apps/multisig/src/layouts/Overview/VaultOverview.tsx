import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { useSelectedMultisig } from '@domains/multisig'
import { Eye, EyeOff } from '@talismn/icons'
import { Button, CircularProgressIndicator } from '@talismn/ui'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { ChainPill } from '@components/ChainPill'
import { atom, useRecoilState } from 'recoil'
import persist from '@domains/persist'
import { Fragment } from 'react'
import { secondsToDuration } from '@util/misc'
import { cn } from '@util/tailwindcss'
import { clsx } from 'clsx'
import useCopied from '@hooks/useCopied'
import { Check, Copy } from '@talismn/icons'
import { Tooltip } from '@talismn/ui'
import { Info, AlertCircle } from '@talismn/icons'

const showMemberState = atom<boolean>({
  key: 'dashboardShowMemberState',
  default: false,
  effects_UNSTABLE: [persist],
})

export const VaultOverview: React.FC = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const [showMembers, setShowMembers] = useRecoilState(showMemberState)
  const { copy, copied } = useCopied()
  const signersAddresses = selectedMultisig.signers.map(signer => signer.toSs58())
  const { contactByAddress, isLoading } = useKnownAddresses({
    addresses: signersAddresses,
  })

  return (
    <section className="flex flex-col p-[24px] rounded-2xl bg-gray-800">
      <div className="w-full flex items-center justify-between flex-1 gap-[8px]">
        <div className="text-[20px] flex-1 w-1 text-offWhite font-bold">
          <h2 className="truncate">{selectedMultisig.name} </h2>
          <p
            className={clsx('text-[14px] truncate  text-gray-200', {
              hidden: !selectedMultisig.description,
            })}
          >
            {selectedMultisig.description}
          </p>
        </div>
        <ChainPill chain={selectedMultisig.chain} identiconSize={24} />
      </div>
      <div className="flex gap-6 mt-6">
        <div>
          <div className="flex gap-[8px]">
            <p className="text-offWhite text-[14px]">Proxied Address</p>
            <Tooltip
              content={
                <p className="text-[12px]">{`This is the funding account address for ${selectedMultisig.chain.chainName} network only.`}</p>
              }
            >
              <Info size={16} />
            </Tooltip>
          </div>
          <AccountDetails
            chain={selectedMultisig.chain}
            address={selectedMultisig.proxyAddress}
            identiconSize={20}
            withAddressTooltip
            nameOrAddressOnly
            disableCopy
          />
        </div>
        <Button
          onClick={() => copy(selectedMultisig.proxyAddress.toSs58(selectedMultisig.chain), 'Proxy address copied!')}
        >
          <div className="flex items-center gap-2">
            <div>Receive</div>
            <div>{copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}</div>
          </div>
        </Button>
      </div>
      <div
        css={{
          display: 'grid',
          gridTemplateColumns: '5fr 4fr',
          gap: '0px 8px',
          marginTop: 24,
        }}
      >
        <p css={({ color }) => ({ color: color.lightGrey, marginBottom: 4, fontSize: 14 })}>Multisig controls</p>
        <p css={({ color }) => ({ color: color.lightGrey, marginBottom: 4, fontSize: 14 })}>Time Delay</p>
        {selectedMultisig.proxies ? (
          selectedMultisig.proxies.length > 0 ? (
            selectedMultisig.proxies.map(proxy => (
              <Fragment key={`${proxy.proxyType}_${proxy.delay}`}>
                <p css={({ color }) => ({ color: color.offWhite })}>{proxy.proxyType} transactions</p>
                <p css={({ color }) => ({ color: color.offWhite })}>
                  {proxy.delay} blocks{' '}
                  <span css={({ color }) => ({ color: color.lightGrey })}>≈{secondsToDuration(proxy.duration)}</span>
                </p>
              </Fragment>
            ))
          ) : (
            <p css={({ color }) => ({ color: color.offWhite })}>No proxy relationship found.</p>
          )
        ) : (
          <CircularProgressIndicator size={22.4} />
        )}
      </div>

      <div
        css={{
          display: 'grid',
          gridTemplateColumns: '5fr 4fr',
          gap: '0px 8px',
          p: { whiteSpace: 'nowrap' },
          alignItems: 'center',
          marginTop: 24,
        }}
      >
        <div>
          <p css={({ color }) => ({ color: color.lightGrey, marginBottom: 4, fontSize: 14 })}>Approval Threshold</p>
          <p css={({ color }) => ({ color: color.offWhite })}>
            {selectedMultisig.threshold} of {selectedMultisig.signers.length} members
          </p>
        </div>
        <div>
          <Button variant="secondary" onClick={() => setShowMembers(!showMembers)}>
            <div className="flex items-center gap-3">
              {showMembers ? <EyeOff size={18} /> : <Eye size={18} />}
              <div className="mt-1 text-nowrap">{showMembers ? 'Hide' : 'Show'} Members</div>
            </div>
          </Button>
        </div>
      </div>
      <div
        className={cn(
          'h-max transition-[max-height] duration-300 overflow-x-hidden w-full',
          showMembers ? 'overflow-y-auto max-h-[9999px]' : 'overflow-y-hidden max-h-0'
        )}
      >
        <div className="flex flex-wrap-reverse gap-x-[32px] gap-y-[16px] flex-1 mt-[16px] w-full">
          <div className="flex flex-col overflow-hidden">
            <p css={({ color }) => ({ color: color.lightGrey, marginBottom: 8, fontSize: 14 })}>Signers</p>
            <div className="flex flex-col gap-[12px] items-start justify-start">
              {selectedMultisig.signers.map(signer => (
                <AccountDetails
                  key={signer.toSs58()}
                  chain={selectedMultisig.chain}
                  address={signer}
                  name={contactByAddress[signer.toSs58()]?.name}
                  identiconSize={20}
                  nameOrAddressOnly
                  withAddressTooltip
                  isNameLoading={isLoading}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex gap-4">
              <p className="text-[14px] text-lightGrey">Current Multisig Address</p>
              <Tooltip
                content={
                  <p className="text-[12px]">
                    This multisig address is the address that controls the proxied account. Do not transfer funds to
                    this address.
                  </p>
                }
              >
                <AlertCircle size={16} className="text-orange-400" />
              </Tooltip>
            </div>
            <AccountDetails
              chain={selectedMultisig.chain}
              address={selectedMultisig.multisigAddress}
              identiconSize={20}
              withAddressTooltip
              nameOrAddressOnly
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default VaultOverview

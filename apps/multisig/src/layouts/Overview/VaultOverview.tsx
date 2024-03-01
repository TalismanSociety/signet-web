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

const showMemberState = atom<boolean>({
  key: 'dashboardShowMemberState',
  default: false,
  effects_UNSTABLE: [persist],
})

export const VaultOverview: React.FC = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const [showMembers, setShowMembers] = useRecoilState(showMemberState)
  const { contactByAddress } = useKnownAddresses(selectedMultisig.id)

  return (
    <section
      css={{
        backgroundColor: 'var(--color-grey800)',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        padding: 24,
      }}
    >
      <div className="w-full flex items-center justify-between flex-1 gap-[8px]">
        <h2 className="text-[20px] flex-1 w-1 overflow-hidden text-offWhite font-bold whitespace-nowrap text-ellipsis">
          {selectedMultisig.name}
        </h2>
        <ChainPill chain={selectedMultisig.chain} identiconSize={20} />
      </div>
      <div css={{ marginTop: 24 }}>
        <p css={({ color }) => ({ color: color.offWhite, fontSize: 14, marginTop: 3 })}>Vault Address</p>
        <AccountDetails
          chain={selectedMultisig.chain}
          address={selectedMultisig.proxyAddress}
          identiconSize={20}
          withAddressTooltip
        />
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
        <div
          css={{
            button: { backgroundColor: 'var(--color-backgroundLight)', padding: '8px 12px' },
          }}
        >
          <Button variant="secondary" onClick={() => setShowMembers(!showMembers)}>
            <div css={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {showMembers ? <EyeOff size={16} /> : <Eye size={16} />}
              <p css={{ fontSize: 14, marginTop: 2 }}>{showMembers ? 'Hide' : 'Show'} Members</p>
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
        <div className="flex flex-wrap-reverse gap-x-[8px] gap-y-[16px] flex-1 mt-[16px] w-full">
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
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col flex-1">
            <p css={({ color }) => ({ color: color.lightGrey, marginBottom: 8, fontSize: 14 })}>Multisig Address</p>
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

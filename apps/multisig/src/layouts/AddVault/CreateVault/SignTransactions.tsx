import { css } from '@emotion/css'
import { Plus, Send } from '@talismn/icons'

import { Button } from '@components/ui/button'
import React, { useMemo } from 'react'
import { Address } from '@util/addresses'
import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { Chain } from '@domains/chains'
import { Check, Info } from 'lucide-react'
import { cn } from '@util/tailwindcss'
import { CircularProgressIndicator } from '@talismn/ui'
import { CONFIG } from '@lib/config'

enum StepStatus {
  Done,
  NotStarted,
}

const Step: React.FC<
  React.PropsWithChildren & {
    icon: React.ReactNode
    name: string
    description: string
    status: StepStatus
  }
> = ({ icon, name, description, status, children }) => {
  return (
    <div
      className={css`
        display: grid;
        grid-template-columns: 24px 1fr;
        grid-template-rows: 1fr;
        gap: 16px;
        width: 100%;
        text-align: left;
      `}
    >
      <div
        className={cn(
          'flex items-center justify-center w-[28px] h-[28px] rounded-full',
          status === StepStatus.Done ? 'bg-green-600/30' : 'bg-gray-800'
        )}
      >
        {status === StepStatus.Done ? <Check size={14} className="text-green-500" /> : icon}
      </div>
      <div>
        <p className="font-bold text-offWhite text-[20px] mb-[4px] leading-[28px]">{name}</p>
        <p className="text-[16px] mb-[12px]">{description}</p>
        {children}
      </div>
    </div>
  )
}

const SignTransactions: React.FC<{
  createdProxy?: Address
  created: boolean
  creating: boolean
  creatingTeam?: boolean
  onBack: () => void
  onCreateProxy: () => Promise<void>
  onSaveVault?: () => Promise<void>
  onTransferProxy: () => Promise<void>
  chain: Chain
  transferred: boolean
  transferring: boolean
  vaultDetailsString: string
}> = ({
  chain,
  createdProxy,
  created,
  creating,
  creatingTeam,
  onBack,
  onCreateProxy,
  onTransferProxy,
  onSaveVault,
  transferred,
  transferring,
  vaultDetailsString,
}) => {
  const getHelpLink = useMemo(() => {
    let link = `mailto:${CONFIG.CONTACT_EMAIL}`
    const subject = 'Issue creating Signet vault'
    let body = `I am having issues creating a vault on Signet. Here are the details of my vault:\n\n`

    body += vaultDetailsString
    body += `\n\nPlease help me resolve this issue.`

    return link + `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }, [vaultDetailsString])

  return (
    <div
      css={{
        display: 'grid',
        gap: 32,
        width: '100%',
        maxWidth: 700,
      }}
    >
      <div css={{ width: '100%', textAlign: 'center' }}>
        <h1>Create vault</h1>
        <p css={{ marginTop: 16 }}>
          Create a pure proxy account and transfer the proxy to your multisig to complete the creation of your Vault.
        </p>
      </div>
      <Step
        name="1. Create proxy"
        icon={<Plus size={16} />}
        description="Create a keyless account that only you, the creator, can control via a proxy."
        status={createdProxy ? StepStatus.Done : StepStatus.NotStarted}
      >
        {createdProxy ? (
          <AccountDetails address={createdProxy} withAddressTooltip chain={chain} />
        ) : (
          <Button className="w-max" loading={creating} disabled={!!createdProxy || creating} onClick={onCreateProxy}>
            Create Proxy
          </Button>
        )}
      </Step>
      <Step
        name="2. Transfer proxy"
        icon={<Send size={12} />}
        description="Transfer the proxy to your multisig so that only the multisig can control the pure account."
        status={transferred ? StepStatus.Done : StepStatus.NotStarted}
      >
        {!transferred && (
          <Button
            className="w-max"
            loading={transferring}
            disabled={!createdProxy || transferring || transferred}
            onClick={onTransferProxy}
          >
            Transfer Proxy
          </Button>
        )}
      </Step>
      {!createdProxy && !creating ? (
        <Button className="mx-auto" variant="outline" onClick={onBack}>
          Back to Confirmation
        </Button>
      ) : transferred ? (
        created ? (
          <p>All done! Redirecting to dashboard...</p>
        ) : creatingTeam ? (
          <div className="flex items-center gap-[8px]">
            <CircularProgressIndicator size={16} />
            <p>Saving your vault to Signet...</p>
          </div>
        ) : (
          <div className="bg-gray-800 w-full max-w-max rounded-[12px] p-[16px] mx-auto">
            <div className="w-full max-w-max flex items-center justify-center gap-[12px]">
              <Info className="text-red-500 min-w-[24px] rotate-180" size={24} />
              <p className="mt-[3px] text-left">
                There was an issue when saving your Vault to Signet.
                <br />
                Please try again or reach out to us.
              </p>
            </div>
            <div className="ml-[36px] mt-[8px] flex items-center justify-start gap-[16px]">
              <Button size="lg" variant="outline" onClick={onSaveVault}>
                Try Again
              </Button>
              <Button size="lg" variant="outline" asLink to={getHelpLink}>
                Get Help
              </Button>
            </div>
          </div>
        )
      ) : (
        <div className="bg-gray-800 w-full max-w-max rounded-[12px] p-[16px] flex items-center justify-center gap-[12px] mx-auto">
          <Info className="text-primary min-w-[24px]" size={24} />
          <p className="text-center mt-[3px]">Do not close this page until your vault is successfully created.</p>
        </div>
      )}
    </div>
  )
}

export default SignTransactions

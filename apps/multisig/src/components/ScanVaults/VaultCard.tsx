import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { ChainPill } from '@components/ChainPill'
import { StatusMessage } from '@components/StatusMessage'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Toggle } from '@components/ui/toggle'
import { useToast } from '@components/ui/use-toast'
import { ScannedVault, importedTeamsState } from '@domains/multisig/vaults-scanner'
import { useCreateOrganisation } from '@domains/offchain-data'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'

const VaultCard: React.FC<{ vault: ScannedVault; onAdded?: () => void }> = ({ onAdded, vault }) => {
  const [showMultisig, setShowMultisig] = useState(false)
  const [add, setAdd] = useState(false)
  const [name, setName] = useState('')
  const { createOrganisation, loading } = useCreateOrganisation()
  const { toast } = useToast()
  const setImportedTeams = useSetRecoilState(importedTeamsState)
  const navigate = useNavigate()
  const { contactByAddress } = useKnownAddresses()
  useEffect(() => {
    if (add && showMultisig) setShowMultisig(false)
  }, [add, showMultisig])

  const handleAddVault = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const { parsedTeam, error } = await createOrganisation({
        name,
        chain: vault.chain.squidIds.chainData,
        multisig_config: {
          signers: vault.multisig.signers.map(s => s.toSs58()),
          threshold: vault.multisig.threshold,
        },
        proxied_address: vault.proxiedAddress.toSs58(),
      })
      if (parsedTeam?.team !== undefined) {
        navigate('/overview')
        setImportedTeams(prev => [...prev, parsedTeam.team!])
        onAdded?.()
      }
      if (error) toast({ title: 'Failed to import', description: error })
    },
    [
      createOrganisation,
      name,
      navigate,
      onAdded,
      setImportedTeams,
      toast,
      vault.chain.squidIds.chainData,
      vault.multisig.signers,
      vault.multisig.threshold,
      vault.proxiedAddress,
    ]
  )

  return (
    <div className="p-[16px]  w-full rounded-[12px] border border-gray-700 gap-[8px] flex flex-col">
      <div className="w-full flex items-center justify-between flex-1 gap-[8px]">
        <div className="flex-1 flex w-1">
          <AccountDetails
            address={vault.proxiedAddress}
            chain={vault.chain}
            withAddressTooltip
            disableCopy
            nameOrAddressOnly
            breakLine
          />
        </div>

        <div className="[&_p]:text-[14px]">
          <ChainPill identiconSize={20} chain={vault.chain} />
        </div>
      </div>
      <p className="text-[14px]">
        Controlled by {vault.multisig.threshold} of {vault.multisig.signers.length} multisg via{' '}
        <span className="text-offWhite font-semibold">{vault.proxy}</span> proxy.
      </p>
      <div className="flex items-center gap-[8px] w-full">
        <Toggle
          className="w-max whitespace-nowrap"
          size="sm"
          variant="default"
          onPressedChange={() => {
            setAdd(false)
            setShowMultisig(!showMultisig)
          }}
          pressed={showMultisig}
        >
          View Multisig
        </Toggle>
        {!loading && (
          <Toggle
            size="sm"
            variant="default"
            pressed={add}
            onClick={() => {
              setShowMultisig(false)
              setAdd(!add)
            }}
          >
            Import to Signet
          </Toggle>
        )}
      </div>
      {showMultisig && (
        <div className="p-[12px] w-full rounded-[12px] gap-[8px] flex flex-col border border-gray-500 my-[8px]">
          <div className="w-full flex items-center justify-between flex-1 gap-[8px]">
            <div className="flex flex-1 w-1 flex-col">
              <p className="text-[14px] mb-[4px]">Multisig Address</p>
              <AccountDetails
                address={vault.multisig.multisigAddress}
                chain={vault.chain}
                nameOrAddressOnly
                withAddressTooltip
                disableCopy
              />
            </div>

            <div className="pr-[12px]">
              <p className="text-[14px] mb-[4px]">Threshold</p>
              <p className="text-offWhite font-bold">
                {vault.multisig.threshold} of {vault.multisig.signers.length}
              </p>
            </div>
          </div>
          <div className="w-full">
            <p className="text-[14px] mt-[12px] mb-[4px]">Signers</p>
            <div className="flex flex-col gap-[8px] w-full max-h-[110px] overflow-y-auto">
              {vault.multisig.signers.map(signer => (
                <div key={signer.toSs58()}>
                  <AccountDetails
                    address={signer}
                    chain={vault.chain}
                    name={contactByAddress[signer.toSs58()]?.name}
                    withAddressTooltip
                    nameOrAddressOnly
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {loading ? (
        <StatusMessage
          message={
            <p className="text-[14px] mt-[2px] whitespace-nowrap overflow-hidden text-ellipsis">
              Importing as <span className="text-offWhite font-bold">{name}</span>
            </p>
          }
          type="loading"
        />
      ) : add ? (
        <form className="w-full rounded-[12px] gap-[8px] flex flex-col my-[8px]" onSubmit={handleAddVault}>
          <Input disabled={loading} label="Name" value={name} onChange={e => setName(e.target.value)} />
          <Button type="submit" className="gap-[8px]" disabled={!name || loading} loading={loading}>
            Add to Signet
          </Button>
        </form>
      ) : null}
    </div>
  )
}

export default VaultCard

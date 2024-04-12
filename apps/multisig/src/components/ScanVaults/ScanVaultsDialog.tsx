import { Dialog, DialogContent } from '@components/ui/dialog'
import {
  acknowledgedVaultsState,
  makeScannedVaultId,
  openScannerState,
  unimportedVaultsState,
} from '@domains/multisig/vaults-scanner'
import { useCallback, useMemo, useRef } from 'react'
import { useRecoilState, useRecoilValue, useRecoilValueLoadable } from 'recoil'
import { ImportedTeamsList } from './ImportedTeamsList'
import { VaultsList } from './VaultsList'
import { Button } from '@components/ui/button'
import { activeTeamsState } from '@domains/offchain-data'
import { CONFIG } from '@lib/config'

export const ScanVaultsDialog: React.FC = () => {
  const [open, setOpen] = useRecoilState(openScannerState)
  const unimportedVaultsLoadable = useRecoilValueLoadable(unimportedVaultsState)
  const [acknowledgedVaults, setAcknowledgedVaults] = useRecoilState(acknowledgedVaultsState)
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeTeams = useRecoilValue(activeTeamsState)

  const unimportedVaults = useMemo(() => {
    if (unimportedVaultsLoadable.state !== 'hasValue') return []
    return unimportedVaultsLoadable.contents ?? []
  }, [unimportedVaultsLoadable])

  const unacknowledgedVaults = useMemo(
    () =>
      unimportedVaults.filter(
        v => !acknowledgedVaults[makeScannedVaultId(v.proxiedAddress, v.multisig.multisigAddress, v.chain)]
      ) ?? [],
    [acknowledgedVaults, unimportedVaults]
  )

  const acknowledge = useCallback(() => {
    setOpen(false)
    setAcknowledgedVaults(old => {
      const newAcknowledged = { ...old }
      unacknowledgedVaults.forEach(v => {
        newAcknowledged[makeScannedVaultId(v.proxiedAddress, v.multisig.multisigAddress, v.chain)] = true
      })
      return newAcknowledged
    })
  }, [setAcknowledgedVaults, setOpen, unacknowledgedVaults])

  const handleOnAdded = useCallback(() => {
    if (activeTeams?.length === 1) setOpen(false)
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeTeams, setOpen])

  return (
    <Dialog
      open={open}
      onOpenChange={open => {
        if (!open) acknowledge()
      }}
    >
      <DialogContent className="max-w-[480px]">
        <div className="w-full flex flex-col gap-[12px] h-full">
          <h1 className="text-[20px] font-bold">
            {unacknowledgedVaults.length > 0 ? 'New Multisigs Detected' : 'Import Detected Multisigs'}
          </h1>
          {unimportedVaults.length === 0 ? (
            <p className="text-[14px]">All detected multisigs have been imported.</p>
          ) : (
            <p className="text-[14px]">
              Through on-chain activities, we detected that you have{' '}
              <span className="text-offWhite">{unimportedVaults.length} multisigs</span> that can be imported into{' '}
              {CONFIG.APP_NAME}.
            </p>
          )}
          <div ref={scrollRef} className="overflow-y-auto max-h-[380px] grid w-full gap-[8px]">
            <ImportedTeamsList
              onViewDashboard={() => {
                acknowledge()
                setOpen(false)
              }}
            />
            <VaultsList onAdded={handleOnAdded} />
          </div>
          <p className="text-[14px]">
            Don't see a multisig you want to import?{' '}
            <Button
              asLink
              to="/add-multisig/import"
              size="lg"
              variant="link"
              className="px-0"
              onClick={() => {
                acknowledge()
                setOpen(false)
              }}
            >
              Import Manually
            </Button>
          </p>
          {unimportedVaults.length > 0 && (
            <Button variant="ghost" size="lg" className="self-center" onClick={acknowledge}>
              Import Later
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

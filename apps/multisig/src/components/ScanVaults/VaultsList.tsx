import { makeScannedVaultId, unimportedVaultsState } from '@domains/multisig/VaultsScanner'
import { useMemo } from 'react'
import { useRecoilValueLoadable } from 'recoil'
import VaultCard from './VaultCard'

export const VaultsList: React.FC<{ onAdded?: () => void }> = ({ onAdded }) => {
  const unimportedVaultsLoadable = useRecoilValueLoadable(unimportedVaultsState)

  const unimportedVaults = useMemo(() => {
    if (unimportedVaultsLoadable.state !== 'hasValue') return []
    return unimportedVaultsLoadable.contents ?? []
  }, [unimportedVaultsLoadable])

  if (unimportedVaults.length === 0) return null
  return (
    <div className="w-full h-full flex flex-col gap-[12px]">
      {unimportedVaults.map(vault => (
        <VaultCard
          key={makeScannedVaultId(vault.proxiedAddress, vault.multisig.multisigAddress, vault.chain)}
          vault={vault}
          onAdded={onAdded}
        />
      ))}
    </div>
  )
}

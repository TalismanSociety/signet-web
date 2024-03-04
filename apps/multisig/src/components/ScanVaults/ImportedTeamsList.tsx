import StatusCircle, { StatusCircleType } from '@components/StatusCircle'
import { Button } from '@components/ui/button'
import { selectedMultisigIdState } from '@domains/multisig'
import { importedTeamsState } from '@domains/multisig/vaults-scanner'
import { X } from 'lucide-react'
import { useCallback } from 'react'
import { useRecoilState, useSetRecoilState } from 'recoil'

export const ImportedTeamsList: React.FC<{ onViewDashboard: (id: string) => void }> = ({ onViewDashboard }) => {
  const [importedTeams, setImportedTeams] = useRecoilState(importedTeamsState)
  const setSelectedMultisigId = useSetRecoilState(selectedMultisigIdState)

  const handleDismiss = useCallback(
    (id: string) => {
      setImportedTeams(prev => prev.filter(t => t.id !== id))
    },
    [setImportedTeams]
  )

  const handleOnViewDashboard = useCallback(
    (id: string) => {
      setSelectedMultisigId(id)
      // dismiss the "notification" if user clicks on the view dashboard button
      handleDismiss(id)
      onViewDashboard(id)
    },
    [setSelectedMultisigId, handleDismiss, onViewDashboard]
  )

  return (
    <div className="w-full grid gap-[8px]">
      {importedTeams?.map(team => (
        <div
          key={team.id}
          className="bg-gray-800 w-full p-[12px] rounded-[12px] flex items-center justify-between gap-[12px]"
        >
          <div className="flex items-center gap-[8px] flex-1">
            <StatusCircle
              iconDimentions={{ height: '16px', width: '16px' }}
              type={StatusCircleType.Success}
              circleDiameter="24px"
            />
            <p className="text-[14px] whitespace-nowrap overflow-hidden text-ellipsis flex-1 w-1">
              Imported <span className="font-bold text-offWhite">{team.name}</span>
            </p>
          </div>
          <div className="flex items-center justify-end gap-[4px]">
            <Button size="sm" variant="outline" className="px-[8px]" onClick={() => handleOnViewDashboard(team.id)}>
              View Dashboard
            </Button>
            <Button size="icon" variant="ghost" onClick={() => handleDismiss(team.id)}>
              <X size={16} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

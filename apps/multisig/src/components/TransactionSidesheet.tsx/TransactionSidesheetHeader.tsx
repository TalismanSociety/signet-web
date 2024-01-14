import { Transaction } from '@domains/multisig'
import { cn } from '@util/tailwindcss'
import { useMemo } from 'react'

enum PillType {
  Pending,
  Executed,
}

const Pill = ({ children, type }: { children: React.ReactNode; type: PillType }) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center px-[8px] py-[2px] rounded-[12px]',
        type === PillType.Executed ? 'text-green-500 bg-green-700/50' : 'text-yellow-500 bg-yellow-600/30'
      )}
    >
      {children}
    </div>
  )
}

export const TransactionSidesheetHeader: React.FC<{ t?: Transaction }> = ({ t }) => {
  const pill = useMemo(() => {
    if (!t) return null
    if (t.executedAt)
      return (
        <Pill type={PillType.Executed}>
          <p className="text-[12px] mt-[3px]">Executed</p>
        </Pill>
      )

    if (t.rawPending)
      return (
        <Pill type={PillType.Pending}>
          <p className="text-[12px] mt-[3px]">Pending</p>
        </Pill>
      )

    return null
  }, [t])

  if (!t) return null

  return (
    <div className="flex items-center gap-[12px]">
      <h2 className="font-bold text-gray-200">Transaction Summary</h2>
      {pill}
    </div>
  )
}

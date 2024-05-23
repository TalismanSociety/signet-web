import { Info, AlertCircle } from '@talismn/icons'
import { Tooltip } from '@talismn/ui'
import { cn } from '@util/tailwindcss'

type Props = {
  label: string
  tooltip?: React.ReactNode
  tooltipType?: 'info' | 'warning'
  labelClassName?: string
  className?: string
}

export const SettingsInfoRow: React.FC<React.PropsWithChildren<Props>> = ({
  labelClassName,
  className,
  label,
  tooltip,
  tooltipType = 'info',
  children,
}) => (
  <div className={cn('flex flex-col gap-[4px] w-full', className)}>
    <div className="flex items-center gap-[8px] text-gray-200">
      <p className={cn('text-[14px] mt-[2px] text-gray-200', labelClassName)}>{label}</p>
      {tooltip && (
        <Tooltip content={<p css={{ fontSize: 12 }}>{tooltip}</p>}>
          {tooltipType === 'warning' ? <AlertCircle size={16} className="text-orange-400" /> : <Info size={16} />}
        </Tooltip>
      )}
    </div>
    {children}
  </div>
)

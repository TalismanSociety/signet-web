import { CheckCircle, Info, XCircle } from '@talismn/icons'
import { CircularProgressIndicator } from '@talismn/ui'
import { cn } from '@util/tailwindcss'
import { useMemo } from 'react'

type Props = {
  type: 'error' | 'success' | 'info' | 'loading'
  message: string
  className?: string
}

export const StatusMessage: React.FC<Props> = ({ type, message, className }) => {
  const icon = useMemo(() => {
    switch (type) {
      case 'error':
        return <XCircle size={16} />
      case 'success':
        return <CheckCircle size={16} />
      case 'loading':
        return <CircularProgressIndicator size={16} />
      default:
        return <Info size={16} />
    }
  }, [type])

  const color = useMemo(() => {
    switch (type) {
      case 'error':
        return 'text-red-500'
      case 'success':
        return 'text-green-500'
      default:
        return 'text-gray-200'
    }
  }, [type])

  return (
    <div className={cn('flex items-center gap-[4px]', color, className)}>
      {icon}
      <p className="text-[12px] leading-[1] mt-[3px] ">{message}</p>
    </div>
  )
}

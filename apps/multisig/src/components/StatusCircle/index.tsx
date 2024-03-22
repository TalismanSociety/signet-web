import { Check, Unknown, X } from '@talismn/icons'
import { CircularProgressIndicator } from '@talismn/ui'
import { cn } from '@util/tailwindcss'
import { ReactNode } from 'react'

export enum StatusCircleType {
  Success,
  PendingApproval,
  Unknown,
  Error,
  Loading,
}

function getColorsAndIcon(type: StatusCircleType): [ReactNode, string] {
  switch (type) {
    case StatusCircleType.Success:
      return [<Check />, 'text-green-500 bg-green-700/30']
    case StatusCircleType.Unknown:
      return [<Unknown />, 'text-gray-200 bg-gray-700']
    case StatusCircleType.PendingApproval:
      return [<Check />, 'bg-gray-700 text-gray-200']
    case StatusCircleType.Error:
      return [<X />, 'text-red-500 bg-red-700/30 hover:bg-red-500/30']
    case StatusCircleType.Loading:
      return [<CircularProgressIndicator />, 'bg-gray-700 text-gray-200']
  }
}

const StatusCircle = (props: {
  type: StatusCircleType
  iconDimentions?: { width: string; height: string }
  circleDiameter?: string
}) => {
  const [icon, colors] = getColorsAndIcon(props.type)
  return (
    <div
      className={cn(
        'h-[24px] w-[24px] min-w-[24px] flex items-center justify-center rounded-full [&>svg]:h-[16px] [&>svg]:w-[16px]',
        colors
      )}
    >
      {icon}
    </div>
  )
}

export default StatusCircle

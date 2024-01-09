import * as React from 'react'

import { cn } from '@util/tailwindcss'
import { CircularProgressIndicator } from '@talismn/ui'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  loading?: boolean
  supportingLabel?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, loading, type, supportingLabel, ...props }, ref) => {
    return (
      <div className="w-full">
        {!!label && <label className="text-[14px] text-gray-200">{label}</label>}
        <div className="w-full relative">
          <input
            type={type}
            className={cn(
              'flex h-[56px] w-full rounded-[8px] bg-gray-800 px-[24px] py-[18px] text-[18px] text-offWhite border border-gray-800 file:border-0 file:bg-transparent file:text-[14px] file:font-medium placeholder:text-gray-400/90 focus-visible:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            ref={ref}
            {...props}
          />
          {loading && (
            <div className="absolute right-[8px] top-1/2 -translate-y-1/2">
              <CircularProgressIndicator size={16} />
            </div>
          )}
        </div>
        {supportingLabel}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }

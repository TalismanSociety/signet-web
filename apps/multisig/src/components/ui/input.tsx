import * as React from 'react'

import { cn } from '@util/tailwindcss'
import { CircularProgressIndicator } from '@talismn/ui'
import { Button } from './button'
import { X } from '@talismn/icons'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode
  loading?: boolean
  supportingLabel?: React.ReactNode
  suffix?: React.ReactNode
  onClear?: () => void
  showClearButton?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, loading, onClear, type, suffix, supportingLabel, showClearButton, ...props }, ref) => {
    const suffixRef = React.useRef<HTMLDivElement>(null)
    const [suffixWidth, setSuffixWidth] = React.useState(0)

    React.useEffect(() => {
      if (!suffixRef.current) return
      setSuffixWidth(suffixRef.current.clientWidth)
    }, [loading, suffix])

    return (
      <div className="w-full">
        {!!label && <label className="text-[14px] text-gray-200">{label}</label>}
        <div className="w-full relative">
          <input
            type={type}
            className={cn(
              'flex h-[56px] w-full rounded-[12px] bg-gray-800 pl-[24px] pt-[16px] pb-[14px] text-[16px] text-offWhite border border-gray-800 file:border-0 file:bg-transparent file:text-[14px] file:text-gray-200 file:cursor-pointer file:font-medium placeholder:text-gray-400/90 focus-visible:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            css={{ paddingRight: suffixWidth || 24 }}
            ref={ref}
            {...props}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 right-0 px-[12px] flex items-center gap-[8px]"
            ref={suffixRef}
          >
            {loading && <CircularProgressIndicator size={16} />}
            {(showClearButton || !!props.value) && !!onClear && (
              <Button size="icon" variant="ghost" onClick={onClear} className="h-[30px]" type="button">
                <X size={16} />
              </Button>
            )}
            {suffix}
          </div>
        </div>
        {supportingLabel}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }

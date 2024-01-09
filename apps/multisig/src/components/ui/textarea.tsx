import * as React from 'react'

import { cn } from '@util/tailwindcss'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, label, ...props }, ref) => {
  return (
    <div className="w-full">
      {!!label && <label className="text-[14px] text-gray-200">{label}</label>}
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-[8px] border border-gray-800 bg-gray-800 px-[24px] py-[16px] text-[18px] placeholder:text-gray-400/90 focus-visible:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    </div>
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }

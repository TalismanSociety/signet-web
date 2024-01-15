import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@util/tailwindcss'
import { CircularProgressIndicator } from '@talismn/ui'
import { Link, LinkProps } from 'react-router-dom'

const buttonVariants = cva(
  'relative inline-flex items-center justify-center whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-100 disabled:bg-gray-800 disabled:text-gray-400',
        destructive: 'bg-red-500 text-offWhite hover:bg-red-500/80',
        outline: 'border border-offWhite text-offWhite hover:bg-offWhite hover:text-gray-800',
        secondary: 'bg-gray-800 text-gray-300 hover:bg-gray-500',
        ghost: 'hover:bg-gray-600 hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[56px] min-h-[56px] px-[32px] py-2 rounded-[1rem]',
        sm: 'h-9 rounded-[1rem] px-3 text-[12px]',
        lg: 'h-12 rounded-[1rem] px-5 text-[14px]',
        icon: 'h-12 w-12 rounded-[0.8rem]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

type AnchorInterface = LinkProps & { asLink: true; asChild?: undefined }
type ButtonInterface = React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; asLink?: false }

export type ButtonProps = (VariantProps<typeof buttonVariants> & (AnchorInterface | ButtonInterface)) & {
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ className, variant, size, asChild = false, asLink = false, loading, children, ...props }, ref) => {
    const Comp = asLink ? Link : asChild ? Slot : 'button'
    return (
      // @ts-ignore
      <Comp className={cn(asLink ? 'w-max' : '', buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        {loading ? (
          <div className="absolute left-[4px] top-1/2 -translate-y-1/2">
            <CircularProgressIndicator size={16} />
          </div>
        ) : null}
        {typeof children === 'string' ? <span className="mt-[2px] text-inherit">{children}</span> : children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

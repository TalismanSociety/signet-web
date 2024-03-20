import { cn } from '@util/tailwindcss'
import { ReactComponent as Logo } from './logo.svg'

export const SignetLogo: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('text-offWhite', className)} {...props}>
    <Logo />
  </div>
)

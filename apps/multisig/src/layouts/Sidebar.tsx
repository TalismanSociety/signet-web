import { cn } from '@util/tailwindcss'
import clsx from 'clsx'
import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

type Props = {
  sections: {
    name: string
    options: {
      name: string
      icon: ReactNode
      onClick?: () => void
      href?: string
      hidden?: boolean
      selected?: boolean
    }[]
  }[]
}
const Sidebar = (props: Props) => (
  <div className="flex flex-col items-center bg-gray-800 p-[12px] rounded-[16px] gap-[32px] lg:pr-[24px] lg:pl-[16px]">
    {props.sections.map(({ name, options }) => (
      <div className="w-full flex flex-col" key={name}>
        <p className="hidden lg:block uppercase text-[12px] mb-[8px]">{name}</p>
        <div className="grid gap-[12px]">
          {options
            .filter(({ hidden }) => !hidden)
            .map(({ name, icon, onClick, href, selected }) => {
              const ui = (
                <div
                  className={cn('w-full flex gap-[8px] items-center duration-300 cursor-pointer hover:brightness-125')}
                >
                  <div
                    key={name}
                    className="w-[40px] h-[40px] flex items-center justify-center lg:h-[32px] lg:w-[32px] lg:[&>svg]:w-[20px] lg:[&>svg]:h-[20px] [&>svg]:w-[24px] [&>svg]:h-[24px]"
                  >
                    {icon}
                  </div>
                  {<span className="hidden lg:block">{name}</span>}
                </div>
              )

              if (href) {
                return (
                  <NavLink
                    key={name}
                    to={href}
                    className={({ isActive, isPending }) => (isActive || isPending ? 'text-offWhite' : 'text-gray-200')}
                  >
                    {ui}
                  </NavLink>
                )
              }

              return (
                <div
                  key={name}
                  onClick={onClick}
                  className={clsx(
                    'w-full flex gap-[8px] items-center duration-300 cursor-pointer hover:brightness-125',
                    selected && 'text-offWhite'
                  )}
                >
                  {ui}
                </div>
              )
            })}
        </div>
      </div>
    ))}
  </div>
)

export default Sidebar

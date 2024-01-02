import { useTheme } from '@emotion/react'
import { IconButton } from '@talismn/ui'
import { size } from '@util/breakpoints'
import clsx from 'clsx'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useWindowSize } from 'react-use'

type Props = {
  sections: {
    name: string
    options: {
      name: string
      icon: ReactNode
      onClick?: () => void
      href?: string
      hidden?: boolean
    }[]
  }[]
  selected?: string
}
const Sidebar = (props: Props) => {
  const theme = useTheme()
  const width = useWindowSize().width

  return (
    <section className="flex flex-col items-center bg-gray-800 px-[16px] py-[12px] rounded-[16px] gap-[32px] lg:pr-[24px]">
      {props.sections.map(({ name, options }) => (
        <div className="w-full flex flex-col" key={name}>
          <p className="hidden lg:block uppercase text-[12px] mb-[8px]">{name}</p>
          <div className="grid gap-[12px]">
            {options
              .filter(({ hidden }) => !hidden)
              .map(({ name, icon, onClick, href }) => {
                const ui = (
                  <div className="w-full flex gap-[8px] items-center duration-300 cursor-pointer hover:brightness-125">
                    <IconButton
                      key={name}
                      contentColor={name === props.selected ? theme.color.offWhite : theme.color.lightGrey}
                      className="lg:[&>svg]:w-[20px] lg:[&>svg]:h-[20px] lg:!w-[32px] lg:!h-[32px]"
                    >
                      {icon}
                    </IconButton>
                    {width > size.md && <span>{name}</span>}
                  </div>
                )

                if (href) {
                  return (
                    <Link key={name} to={href}>
                      {ui}
                    </Link>
                  )
                }

                return (
                  <div
                    key={name}
                    onClick={onClick}
                    className={clsx(
                      'w-full flex gap-[8px] items-center duration-300 cursor-pointer hover:brightness-125',
                      props.selected === name && 'text-offWhite'
                    )}
                  >
                    {ui}
                  </div>
                )
              })}
          </div>
        </div>
      ))}
    </section>
  )
}

export default Sidebar

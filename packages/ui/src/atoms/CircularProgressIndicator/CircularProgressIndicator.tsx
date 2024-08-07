import { keyframes } from '@emotion/react'
import { Loader } from '@talismn/icons'

export type CircularProgressIndicatorProps = {
  size?: string | number
}

const fade = keyframes`
  from { opacity: 0.25; }
  to { opacity: 1; }
`

const CircularProgressIndicator = (props: CircularProgressIndicatorProps) => (
  <Loader
    size={props.size}
    css={{
      path: {
        'animation': `${fade} 1s linear infinite`,
        '&:nth-of-type(1)': {},
        '&:nth-of-type(8)': {
          animationDelay: '0.125s',
        },
        '&:nth-of-type(6)': {
          animationDelay: '0.25s',
        },
        '&:nth-of-type(4)': {
          animationDelay: '0.375s',
        },
        '&:nth-of-type(2)': {
          animationDelay: '0.5s',
        },
        '&:nth-of-type(7)': {
          animationDelay: '0.625s',
        },
        '&:nth-of-type(5)': {
          animationDelay: '0.75s',
        },
        '&:nth-of-type(3)': {
          animationDelay: '0.875s',
        },
      },
    }}
  />
)

export default CircularProgressIndicator

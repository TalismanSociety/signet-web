import { css } from '@emotion/css'
import { Select } from '@talismn/ui'
import { VoteDetailsForm } from '@domains/referenda'

type Props = {
  conviction: number
  setVoteDetails: React.Dispatch<React.SetStateAction<VoteDetailsForm>>
}

const CONVICTIONS = [1, 2, 4, 8, 16, 32].map((lock, index): [value: number, duration: number] => [index + 1, lock])

export function createConvictionsOpts(): { headlineText: string; value: number }[] {
  return [
    { headlineText: '0.1x voting balance, no lockup period', value: 0 },
    ...CONVICTIONS.map(([value, duration]) => ({
      // TODO: show duration in human readable format (e.g. 1d, 7d)
      headlineText: `${value}x voting balance, locked for ${duration}x period`,
      value,
    })),
  ]
}

// ref: https://github.com/polkadot-js/apps/blob/master/packages/react-components/src/ConvictionDropdown.tsx
const ConvictionsDropdown: React.FC<Props> = ({ conviction, setVoteDetails }) => {
  const options = createConvictionsOpts()

  const handleChange = (value: number) => {
    setVoteDetails(prev => {
      const updatedVal = { ...prev }
      updatedVal.details.Standard.vote.conviction = value
      return updatedVal
    })
  }

  return (
    <Select
      className={css`
        button {
          height: 56px;
        }
      `}
      onChange={handleChange}
      value={conviction}
    >
      {options.map(({ headlineText, value }) => (
        <Select.Option key={value} headlineText={headlineText} value={value} />
      ))}
    </Select>
  )
}

export default ConvictionsDropdown

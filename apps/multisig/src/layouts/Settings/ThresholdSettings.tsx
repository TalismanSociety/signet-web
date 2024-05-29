import { Select } from '@talismn/ui'
import { cn } from '@util/tailwindcss'
import { useEffect } from 'react'

type Props = {
  threshold: number
  onChange: (threshold: number) => void
  membersCount: number
  disabled?: boolean
  error?: boolean
}

export const ThresholdSettings: React.FC<Props> = ({ disabled, error, membersCount, onChange, threshold }) => {
  // TODO: Move this to SignersSettings handleRemove fn
  useEffect(() => {
    if (threshold > membersCount) onChange(membersCount)
    // else if (threshold < 2 && membersCount > 1) onChange(2)
  }, [membersCount, onChange, threshold])
  return (
    <div css={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <p className={cn('text-[14px] mt-[2px]', error ? 'text-red-500' : 'text-offWhite')}>Threshold</p>
        <p className="text-[14px] text-gray-200 mt-[4px]">The number of approvals required to execute a transaction.</p>
      </div>
      <div
        css={({ color }) => ({ display: 'flex', gap: 8, alignItems: 'center', color: color.offWhite, marginTop: 8 })}
      >
        {disabled ? (
          <div
            css={({ color }) => ({
              backgroundColor: color.surface,
              padding: '8px 12.5px',
              color: color.offWhite,
              borderRadius: 12,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            {threshold}
          </div>
        ) : (
          <Select
            css={({ color }) => ({ button: { gap: 8, paddingRight: 8, svg: { color: color.lightGrey } } })}
            placeholder={<p css={({ color }) => ({ color: color.offWhite })}>{threshold}</p>}
            onChange={onChange}
          >
            {Array.from({ length: membersCount }, (_, i) => i + 1).map(i => (
              <Select.Option key={i} leadingIcon={<p>{i}</p>} headlineText={null} value={i} />
            ))}
          </Select>
        )}
        <p>out of {membersCount} Members</p>
      </div>
    </div>
  )
}

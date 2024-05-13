import { Button } from '@components/ui/button'
import { Calendar } from '@components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { useCallback, useMemo } from 'react'

type Props = {
  blockTime?: number
  currentBlock?: number
  value?: number
  onChange: (blockNumber: number) => void
  minBlock?: number
  inputRef: (node: HTMLInputElement | null) => void
  onKeyDown: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>['onKeyDown']
}

export const MultisendTableBlockInput: React.FC<Props> = ({
  blockTime,
  currentBlock,
  value,
  onChange,
  onKeyDown,
  minBlock,
  inputRef,
}) => {
  const derivedDate = useMemo(() => {
    if (currentBlock === undefined || blockTime === undefined || value === undefined) return undefined

    const now = new Date()
    const blocksDiff = value - currentBlock
    const msDiff = blocksDiff * blockTime
    return new Date(now.getTime() + msDiff)
  }, [blockTime, currentBlock, value])

  const handleDateChange = useCallback(
    (day: Date | undefined) => {
      if (!blockTime || !currentBlock || !day) return
      const now = new Date()
      const msDiff = day.getTime() - now.getTime() + 5000
      const blocksDiff = Math.ceil(msDiff / blockTime)
      onChange(blocksDiff + currentBlock)
    },
    [blockTime, currentBlock, onChange]
  )

  return (
    <div className="w-full flex items-center gap-[4px]">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" variant="secondary" className="min-w-[30px]">
            <CalendarIcon size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-max">
          <Calendar
            selected={derivedDate}
            initialFocus
            mode="single"
            defaultMonth={derivedDate}
            onSelect={handleDateChange}
            disabled={date => {
              if (minBlock === undefined) return false
              if (!blockTime || !currentBlock) return true
              const blockNumber =
                Math.ceil((date.getTime() - new Date(new Date().toLocaleDateString()).getTime()) / blockTime) +
                currentBlock
              return blockNumber < minBlock
            }}
          />
        </PopoverContent>
      </Popover>
      <input
        className="focus:outline-none bg-transparent w-full text-right leading-none pt-[3px] text-[14px]"
        value={value === undefined ? '' : value}
        onChange={e => {
          const valueNumber = Number(e.target.value)
          if (isNaN(valueNumber)) return
          onChange(valueNumber)
        }}
        placeholder="0"
        ref={ref => inputRef(ref)}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}

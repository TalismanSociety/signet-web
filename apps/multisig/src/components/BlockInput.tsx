import React, { useCallback, useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Input } from './ui/input'
import { Calendar } from './ui/calendar'

type Props = {
  blockTime?: number
  currentBlock?: number
  label?: string | ((byDate: boolean) => string)
  value: number
  onChange: (blockNumber: number) => void
  minBlock?: number
}
export const BlockInput: React.FC<Props> = ({ blockTime, currentBlock, minBlock, label, onChange, value }) => {
  const [openDate, setOpenDate] = useState(false)
  const [byDate, setByDate] = useState(true)

  const derivedDate = useMemo(() => {
    if (currentBlock === undefined || blockTime === undefined) return undefined

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

  const handleToggleByDate = () => {
    if (!byDate && (value === 0 || Number.isNaN(value))) handleDateChange(new Date())
    setByDate(!byDate)
  }

  return (
    <div className="w-full">
      <Input
        labelSuffix={
          <div className="w-full">
            <p className="text-primary hover:text-primary/70 text-[14px] cursor-pointer" onClick={handleToggleByDate}>
              By {byDate ? 'Block' : 'Date'}
            </p>
          </div>
        }
        label={typeof label === 'function' ? label(byDate) : label}
        suffix={
          value > 0 ? (
            <p className="text-[12px]">{byDate ? value.toLocaleString() : derivedDate?.toLocaleDateString()}</p>
          ) : null
        }
        onClick={() => setOpenDate(byDate && !!derivedDate)}
        value={byDate ? (derivedDate ? derivedDate.toLocaleDateString() : '') : value}
        disabled={!blockTime || !currentBlock}
        loading={!blockTime || !currentBlock}
        type={byDate ? 'text' : 'number'}
        onChange={e => {
          if (byDate) return
          try {
            onChange(parseInt(e.target.value))
          } catch (e) {}
        }}
      />
      <Popover open={openDate} onOpenChange={setOpenDate}>
        <PopoverTrigger asChild>
          <div />
        </PopoverTrigger>
        <PopoverContent className="w-full bg-gray-900 border border-gray-700" align="start">
          {derivedDate && (
            <Calendar
              selected={derivedDate}
              defaultMonth={derivedDate}
              initialFocus
              mode="single"
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
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

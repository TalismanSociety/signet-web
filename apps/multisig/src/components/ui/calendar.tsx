import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@util/tailwindcss'
import { buttonVariants } from '@components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-[12px]', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-[16px] sm:space-x-[16px] sm:space-y-0',
        month: 'space-y-[16px]',
        caption: 'flex justify-center pt-[4px] relative items-center',
        caption_label: 'text-[16px] font-medium',
        nav: 'space-x-[4px] flex items-center absolute right-[4px]',
        nav_button: cn(
          buttonVariants({ variant: 'secondary' }),
          'min-h-[28px] h-[28px] w-[28px] p-0 hover:bg-gray-800 text-gray-200 bg-gray-700'
        ),
        // nav_button_previous: 'absolute left-[4px]',
        // nav_button_next: 'absolute right-[4px]',
        table: 'w-full border-collapse space-y-[4px]',
        head_row: 'flex',
        head_cell: 'text-gray-200 rounded-md w-[36px] font-normal text-[12px]',
        row: 'flex w-full mt-2',
        cell: 'h-[36px] w-[36px] min-h-[36px] text-center text-[12px] p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-[36px] w-[36px] min-h-[36px] p-0 font-normal aria-selected:opacity-100 hover:bg-gray-500'
        ),
        day_range_end: 'day-range-end',
        day_selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        day_today: 'bg-gray-700 text-accent-foreground hover:bg-gray-700 hover:text-accent-foreground',
        day_outside:
          'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
        day_disabled: 'text-muted-foreground opacity-50',
        day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-[16px] w-[16px]" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-[16px] w-[16px]" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }

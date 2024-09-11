import { useEffect, useState } from 'react'

export function useDebounce<TValue = any>(value: TValue, delay: number, cb?: () => void) {
  const [debouncedValue, setDebouncedValue] = useState<TValue>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      if (cb) {
        cb()
      }
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay, cb])

  return debouncedValue
}

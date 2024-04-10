import { useEffect, useState } from 'react'

export function useDebounce<TValue = any>(value: TValue, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState<TValue>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

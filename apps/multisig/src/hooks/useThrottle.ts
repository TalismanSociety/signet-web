import { useEffect, useRef } from 'react'

export const useThrottle = (fn: Function, delay = 500) => {
  const lastRan = useRef(Date.now())

  useEffect(() => {
    const handler = setTimeout(function () {
      if (Date.now() - lastRan.current >= delay) {
        fn()
        lastRan.current = Date.now()
      }
    }, delay - (Date.now() - lastRan.current))

    return () => {
      clearTimeout(handler)
    }
  }, [fn, delay])
}

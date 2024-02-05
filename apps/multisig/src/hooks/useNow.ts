import { useEffect, useState } from 'react'

export const useNow = () => {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    let id = setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => clearInterval(id)
  }, [])

  return now
}

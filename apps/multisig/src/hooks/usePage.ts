import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

export const usePage = () => {
  const location = useLocation()
  const page = useMemo(() => {
    const hash = location.hash
    const page = parseInt(hash.replace('#', ''), 10)
    return isNaN(page) ? 1 : page
  }, [location.hash])

  return page
}

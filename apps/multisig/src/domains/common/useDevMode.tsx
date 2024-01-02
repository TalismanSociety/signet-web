import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export const useDevMode = () => {
  const [search] = useSearchParams()
  return useMemo(() => search.get('dev') !== null, [search])
}

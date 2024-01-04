import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@components/ui/use-toast'

const useCopied = (duration = 1000) => {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const copy = useCallback(
    (text: string, title = 'Copied!', description = text) => {
      if (copied) return
      navigator.clipboard.writeText(text)
      toast({
        title,
        description,
      })
      setCopied(true)
    },
    [copied, toast]
  )

  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false)
      }, duration)
    }
  }, [copied, duration])

  return { copied, copy }
}

export default useCopied

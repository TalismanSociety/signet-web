import { useCallback } from 'react'
import { unstable_useBlocker, useBeforeUnload } from 'react-router-dom'

export const useBlockUnload = (shouldBlock: boolean) => {
  unstable_useBlocker(shouldBlock)
  useBeforeUnload(
    useCallback(
      e => {
        if (!shouldBlock) return
        e.preventDefault()
        const warning = 'You have unsaved changes. Are you sure you want to leave?'
        e.returnValue = warning
        return warning
      },
      [shouldBlock]
    )
  )
}

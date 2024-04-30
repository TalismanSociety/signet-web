import { useApi } from './pjs-api'
import { useCallback, useEffect, useRef, useState } from 'react'
import { VoidFn } from '@polkadot/api/types'

export const useLatestBlockNumber = (chainGenesisHash: string) => {
  const { api } = useApi(chainGenesisHash)
  const [blockNumber, setBlockNumber] = useState<number>()
  const unsub = useRef<VoidFn | undefined>()

  const subscribeToBlockNumber = useCallback(async () => {
    const u = await api?.query.system.number(blockNumber => {
      setBlockNumber(blockNumber.toNumber())
    })
    unsub.current = u
  }, [api?.query.system])

  // cleanup if address / chain changed
  useEffect(() => {
    if (unsub.current) {
      unsub.current()
      unsub.current = undefined
    }

    setBlockNumber(undefined)
  }, [api])

  useEffect(() => {
    if (blockNumber !== undefined) return

    subscribeToBlockNumber()
  }, [blockNumber, subscribeToBlockNumber])

  return blockNumber
}

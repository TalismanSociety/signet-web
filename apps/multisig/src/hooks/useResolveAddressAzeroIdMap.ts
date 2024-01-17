import { Address } from '@util/addresses'
import { resolveAzeroId, isAzeroId } from '@util/azeroid'
import { useCallback, useEffect } from 'react'
import { atom, useRecoilState } from 'recoil'
import { recoilPersist } from 'recoil-persist'

const { persistAtom } = recoilPersist()

export type AddressAzeroIdMap = Record<string, string | undefined>

export const addressToAzeroIdState = atom<AddressAzeroIdMap>({
  key: 'addressToAzeroIdState',
  default: {} as AddressAzeroIdMap,
  effects_UNSTABLE: [persistAtom],
})

export const azeroIdToAddressState = atom<AddressAzeroIdMap>({
  key: 'azeroIdToAddressState',
  default: {} as AddressAzeroIdMap,
  effects_UNSTABLE: [persistAtom],
})

export const queueState = atom<string[]>({
  key: 'queue',
  default: [],
  effects_UNSTABLE: [persistAtom],
})

export const prevEntryState = atom<string[]>({
  key: 'prevEntry',
  default: [],
  effects_UNSTABLE: [persistAtom],
})

export function useResolveAddressAzeroIdMap() {
  const [addressToAzeroId, setAddressToAzeroId] = useRecoilState(addressToAzeroIdState)
  const [azeroIdToAddress, setAzeroIdToAddress] = useRecoilState(azeroIdToAddressState)
  const [queue, setQueue] = useRecoilState(queueState)
  const [prevEntry, setPrevEntry] = useRecoilState(prevEntryState)

  const readyQueue = useCallback(
    (entries: string[]) => {
      if (JSON.stringify(entries) === JSON.stringify(prevEntry)) return
      let q: string[] = []
      //checks entries
      for (const entry of entries) {
        //checks if is address or azeroId & checks each map for keys of corresponding entry
        if (
          (Address.fromSs58(entry) && !addressToAzeroId.hasOwnProperty(entry)) ||
          (isAzeroId(entry) && !addressToAzeroId.hasOwnProperty(entry))
        ) {
          //pushes entry onto corresponding queues if values does not exist (is this necessary?)
          q.push(entry)
        }
      }
      setPrevEntry(entries)
      setQueue(preQ => [...preQ, ...q])
    },
    [addressToAzeroId, prevEntry, setPrevEntry, setQueue]
  )

  const resolveAddressesAndAzeroIds = useCallback(
    async (addressesOrAzeroIds: string[], option: { appendOnly: boolean } = { appendOnly: true }) => {
      let newAddressToAzeroIds: AddressAzeroIdMap = {}
      let newAzeroIdsToAddress: AddressAzeroIdMap = {}

      for (const addressOrAzeroId of addressesOrAzeroIds) {
        const { address, azeroId } = await resolveAzeroId(addressOrAzeroId)

        if (address) {
          newAddressToAzeroIds = {
            ...newAddressToAzeroIds,
            [address]: azeroId,
          }
        }

        if (azeroId) {
          newAzeroIdsToAddress = {
            ...newAzeroIdsToAddress,
            [azeroId]: address,
          }
        }
      }

      if (option.appendOnly) {
        setAddressToAzeroId(currentMap => ({ ...currentMap, ...newAddressToAzeroIds }))
        setAzeroIdToAddress(currentMap => ({ ...currentMap, ...newAzeroIdsToAddress }))
      } else {
        setAddressToAzeroId(newAddressToAzeroIds)
        setAzeroIdToAddress(newAzeroIdsToAddress)
      }

      return { newAddressToAzeroIds, newAzeroIdsToAddress }
    },
    [setAddressToAzeroId, setAzeroIdToAddress]
  )

  //process for any updates to queue (q)
  useEffect(() => {
    //if q is not empty
    if (queue.length > 0) {
      resolveAddressesAndAzeroIds(queue)
      setQueue([])
    }
  }, [queue, resolveAddressesAndAzeroIds, setQueue])

  // every 15 seconds update all values of queue for azeroIds
  useEffect(() => {
    const interval = setInterval(() => {
      resolveAddressesAndAzeroIds(Object.keys(addressToAzeroId), { appendOnly: false })
    }, 15000)
    return () => clearInterval(interval)
  }, [addressToAzeroId, resolveAddressesAndAzeroIds])

  return {
    queue,
    prevEntry,
    readyQueue,
    addressToAzeroId,
    azeroIdToAddress,
  }
}

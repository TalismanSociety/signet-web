import { useCallback, useEffect, useState } from 'react'
import { atom, selector, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { selectedAccountState } from '../auth'
import { DUMMY_MULTISIG_ID, useSelectedMultisig } from '../multisig'
import { gql } from 'graphql-request'
import { requestSignetBackend } from './hasura'
import { Address } from '@util/addresses'
import { isEqual } from 'lodash'
import { parseContractBundle, ParsedContractBundle } from '@domains/substrate-contracts'
import { captureException } from '@sentry/react'

const SMART_CONTRACTS_QUERY = gql`
  query Contracts($teamId: uuid!) {
    smart_contract(where: { team_id: { _eq: $teamId } }, order_by: { name: asc }, limit: 300) {
      id
      abi
      address
      name
      team_id
    }
  }
`

export type SmartContract = {
  id: string
  name: string
  abi: ParsedContractBundle
  address: Address
  teamId: string
}

export const smartContractsLoadingState = atom<boolean>({
  key: 'smartContractsLoadingState',
  default: false,
})

export const smartContractsByTeamIdState = atom<Record<string, SmartContract[]>>({
  key: 'smartContractsByTeamIdState',
  default: {},
})

// allow efficient lookup of contacts by vault's team id
export const smartContractsByTeamIdMapState = selector({
  key: 'smartContractsByTeamIdMap',
  get: ({ get }) => {
    const smartContractsByTeamId = get(smartContractsByTeamIdState)

    const map = {} as Record<string, Record<string, SmartContract>>

    Object.entries(smartContractsByTeamId).forEach(([teamId, contracts]) => {
      map[teamId] = {}
      contracts.forEach(contract => {
        map[teamId]![contract.address.toSs58()] = contract
      })
    })
    return map
  },
})

export const useSmartContracts = () => {
  const loading = useRecoilValue(smartContractsLoadingState)
  const smartContractsByTeamId = useRecoilValue(smartContractsByTeamIdState)
  const smartContractsByTeamIdMap = useRecoilValue(smartContractsByTeamIdMapState)
  const [selectedMultisig] = useSelectedMultisig()

  if (selectedMultisig.id === DUMMY_MULTISIG_ID) return { contacts: [], contactsByAddress: {}, loading: false }

  return {
    contacts: smartContractsByTeamId[selectedMultisig.id],
    contactsByAddress: smartContractsByTeamIdMap[selectedMultisig.id] ?? {},
    loading,
  }
}

export const useAddSmartContract = () => {
  const [loading, setLoading] = useState(false)
  const selectedAccount = useRecoilValue(selectedAccountState)
  const [smartContractsByTeamId, setSmartContractsByTeamId] = useRecoilState(smartContractsByTeamIdState)

  const addContract = useCallback(
    async (address: Address, name: string, teamId: string, abi: ParsedContractBundle) => {
      if (!selectedAccount) throw new Error('Unauthorised!')
      try {
        setLoading(true)
        const { data, error } = await requestSignetBackend(
          gql`
            mutation AddContract($address: String!, $name: String!, $teamId: uuid!, $abi: String!) {
              insert_smart_contract_one(object: { address: $address, name: $name, team_id: $teamId, abi: $abi }) {
                id
              }
            }
          `,
          {
            address: address.toSs58(),
            name,
            teamId,
            abi: abi.raw,
          },
          selectedAccount
        )

        const id = data?.insert_smart_contract_one?.id
        if (!id || error) {
          // this error is not meant to be shown to users
          throw error ?? new Error('Unknown error.')
        }
        let smartContracts = smartContractsByTeamId[teamId] ?? []
        const newContract = { id, name, teamId, address, abi }

        // contract may be added to inmemory cache via watcher
        const conflict = smartContracts.find(contact => contact.address.isEqual(address))
        if (conflict) return newContract

        console.log(newContract, smartContracts)
        smartContracts = [...smartContracts, newContract]
        setSmartContractsByTeamId({ ...smartContractsByTeamId, [teamId]: smartContracts })

        // inform caller that contact was created
        return newContract
      } catch (e) {
        console.error(e)
        captureException(e)
        throw e
      } finally {
        setLoading(false)
      }
    },
    [selectedAccount, setSmartContractsByTeamId, smartContractsByTeamId]
  )

  return { addContract, loading }
}

// export const useDeleteSmartContract = () => {
//   const [deleting, setDeleting] = useState(false)
//   const selectedAccount = useRecoilValue(selectedAccountState)
//   const [smartContractsByTeamId, setSmartContractsByTeamId] = useRecoilState(smartContractsByTeamIdState)

//   const deleteContact = useCallback(
//     async (id: string) => {
//       if (!selectedAccount) return
//       try {
//         setDeleting(true)
//         const { data, error } = await requestSignetBackend(
//           gql`
//             mutation DeleteAddress($id: uuid!) {
//               delete_address_by_pk(id: $id) {
//                 id
//                 team_id
//               }
//             }
//           `,
//           { id },
//           selectedAccount
//         )

//         const deletedId = data?.delete_address_by_pk?.id
//         const teamId = data?.delete_address_by_pk?.team_id
//         if (!deletedId || !teamId || error) {
//           toast.error('Failed to delete contact, please try again.')
//           return
//         }
//         toast.success(`Contact deleted!`)

//         let addresses = smartContractsByTeamId[teamId] ?? []
//         const stillInList = addresses.find(contact => contact.id === id)

//         if (stillInList) {
//           addresses = addresses.filter(contact => contact.id !== id)
//           setSmartContractsByTeamId({ ...smartContractsByTeamId, [teamId]: addresses })
//         }

//         // inform caller that contact was deleted
//         return true
//       } catch (e) {
//         console.error(e)
//       } finally {
//         setDeleting(false)
//       }
//     },
//     [selectedAccount, setSmartContractsByTeamId, smartContractsByTeamId]
//   )

//   return { deleteContact, deleting }
// }

export const SmartContractsWatcher = () => {
  const selectedAccount = useRecoilValue(selectedAccountState)
  const [selectedMultisig] = useSelectedMultisig()
  const setLoading = useSetRecoilState(smartContractsLoadingState)
  const [smartContractsByTeamId, setSmartContractsByTeamId] = useRecoilState(smartContractsByTeamIdState)

  const fetchSmartContracts = useCallback(async () => {
    if (!selectedAccount || selectedMultisig.id === DUMMY_MULTISIG_ID) return

    try {
      setLoading(true)
      const { data } = await requestSignetBackend<{
        smart_contract: { address: string; id: string; team_id: string; name: string; abi: string }[]
      }>(SMART_CONTRACTS_QUERY, { teamId: selectedMultisig.id }, selectedAccount)

      if (data?.smart_contract) {
        const newSmartContractsByTeamId = { ...smartContractsByTeamId }
        if (!newSmartContractsByTeamId[selectedMultisig.id]) newSmartContractsByTeamId[selectedMultisig.id] = []

        // parse each smart contract so we have better types and utility functions from classes
        data.smart_contract.forEach(({ id, abi, name, address, team_id }) => {
          try {
            const parsedAddress = Address.fromSs58(address)
            const parsedAbi = parseContractBundle(JSON.parse(abi))

            if (!parsedAddress) throw new Error(`Failed to parse address for contract ${id}: ${address}`)
            if (!parsedAbi) throw new Error(`Failed to parse contract bundle for ${id}: ${abi}`)

            const smartContractsOfTeam = newSmartContractsByTeamId[team_id] ?? []
            const conflict = smartContractsOfTeam.find(contact => contact.address.isEqual(parsedAddress))
            // contract might have already been cached
            if (conflict) return

            // add contract to in memory cache
            smartContractsOfTeam.push({ id, name, teamId: team_id, abi: parsedAbi, address: parsedAddress })
            newSmartContractsByTeamId[team_id] = smartContractsOfTeam
          } catch (e) {
            console.error('Failed to parse contact:')
            console.error(e)
          }
        })

        if (isEqual(smartContractsByTeamId, newSmartContractsByTeamId)) return
        setSmartContractsByTeamId(newSmartContractsByTeamId)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selectedAccount, selectedMultisig.id, setLoading, setSmartContractsByTeamId, smartContractsByTeamId])

  useEffect(() => {
    if (!selectedAccount) return
    // fetch address book for the first time
    fetchSmartContracts()

    // refresh every 15secs to update address books in "real-time"
    const interval = setInterval(() => {
      fetchSmartContracts()
    }, 15_000)

    return () => clearInterval(interval)
  }, [fetchSmartContracts, selectedAccount])

  return null
}

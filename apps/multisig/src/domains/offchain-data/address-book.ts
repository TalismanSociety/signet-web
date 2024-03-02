import { useCallback, useEffect } from 'react'
import { atom, selector, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { selectedAccountState } from '../auth'
import { DUMMY_MULTISIG_ID, useSelectedMultisig } from '../multisig'
import { gql } from 'graphql-tag'
import { Address } from '@util/addresses'
import { isEqual } from 'lodash'
import { useMutation, useQuery } from '@apollo/client'
import { captureException } from '@sentry/react'
import { useToast } from '@components/ui/use-toast'

const ADDRESSES_QUERY = gql`
  query Addresses($orgId: uuid!) {
    address(where: { org_id: { _eq: $orgId } }, order_by: { name: asc }, limit: 1000) {
      id
      name
      address
      team_id
      org_id
    }
  }
`

export type Contact = {
  id: string
  name: string
  address: Address
  orgId: string
}

export const addressBookLoadingState = atom<boolean>({
  key: 'addressBookLoadingState',
  default: false,
})

export const addressBookByTeamIdState = atom<Record<string, Contact[]>>({
  key: 'addressBookByTeamIdState',
  default: {},
})

// allow efficient lookup of contacts by address
export const addressBookByTeamIdMapState = selector({
  key: 'addressBookByTeamIdMap',
  get: ({ get }) => {
    const addressBookByTeamId = get(addressBookByTeamIdState)

    const map = {} as Record<string, Record<string, Contact>>

    Object.entries(addressBookByTeamId).forEach(([orgId, contacts]) => {
      map[orgId] = {}
      contacts.forEach(contact => {
        map[orgId]![contact.address.toSs58()] = contact
      })
    })
    return map
  },
})

export const useAddressBook = () => {
  const loading = useRecoilValue(addressBookLoadingState)
  const addressBookByTeamId = useRecoilValue(addressBookByTeamIdState)
  const addressBookByTeamIdMap = useRecoilValue(addressBookByTeamIdMapState)
  const [selectedMultisig] = useSelectedMultisig()

  if (selectedMultisig.id === DUMMY_MULTISIG_ID) return { contacts: [], contactsByAddress: {}, loading: false }

  return {
    contacts: addressBookByTeamId[selectedMultisig.orgId],
    contactsByAddress: addressBookByTeamIdMap[selectedMultisig.orgId] ?? {},
    loading,
  }
}

const CREATE_ADDRESS_MUTATION = gql`
  mutation CreateAddress($address: String!, $name: String!, $orgId: uuid!) {
    insert_address_one(
      object: { address: $address, name: $name, org_id: $orgId }
      on_conflict: { constraint: address_address_org_id_team_id_key, update_columns: [address, name] }
    ) {
      id
      org_id
      team_id
      name
      address
    }
  }
`
export const useCreateContact = () => {
  const setAddressBookByTeamId = useSetRecoilState(addressBookByTeamIdState)
  const [mutate, { loading, error }] = useMutation(CREATE_ADDRESS_MUTATION, {
    onCompleted: data => {
      const { id, name, address, org_id } = data.insert_address_one
      setAddressBookByTeamId(prev => {
        const addresses = [...(prev[org_id] ?? [])]
        const parsedAddress = Address.fromSs58(address)
        if (!parsedAddress) {
          console.error('Failed to parse saved address: ', address)
          return prev
        }
        const conflict = addresses.find(contact => contact.address.isEqual(parsedAddress))
        if (!conflict) {
          return { ...prev, [org_id]: [...addresses, { id, name, orgId: org_id, address: Address.fromSs58(address) }] }
        }
        return prev
      })
    },
  })

  const createContact = useCallback(
    async (address: Address, name: string, orgId: string) =>
      mutate({
        variables: {
          address: address.toSs58(),
          name,
          orgId,
        },
      }),
    [mutate]
  )

  return { createContact, creating: loading, error }
}

export const useDeleteContact = () => {
  const { toast } = useToast()
  const [addressBookByTeamId, setAddressBookByTeamId] = useRecoilState(addressBookByTeamIdState)
  const [mutate, { loading: deleting }] = useMutation(gql`
    mutation DeleteAddress($id: uuid!) {
      delete_address_by_pk(id: $id) {
        id
        org_id
      }
    }
  `)

  const deleteContact = useCallback(
    async (id: string) => {
      try {
        const { data, errors } = await mutate({ variables: { id } })

        const deletedId = data?.delete_address_by_pk?.id
        const orgId = data?.delete_address_by_pk?.org_id
        if (!deletedId || !orgId || errors) {
          toast({
            title: 'Failed to delete contact',
            description: 'Please try again.',
          })
          if (errors) captureException(errors)
          return
        }
        toast({ title: `Contact deleted!` })

        let addresses = addressBookByTeamId[orgId] ?? []
        const stillInList = addresses.find(contact => contact.id === id)

        if (stillInList) {
          addresses = addresses.filter(contact => contact.id !== id)
          setAddressBookByTeamId({ ...addressBookByTeamId, [orgId]: addresses })
        }

        // inform caller that contact was deleted
        return true
      } catch (e) {
        console.error(e)
        return false
      }
    },
    [addressBookByTeamId, mutate, setAddressBookByTeamId, toast]
  )

  return { deleteContact, deleting }
}

export const AddressBookWatcher = () => {
  const selectedAccount = useRecoilValue(selectedAccountState)
  const setLoading = useSetRecoilState(addressBookLoadingState)
  const [selectedMultisig] = useSelectedMultisig()
  const setAddressBookByTeamId = useSetRecoilState(addressBookByTeamIdState)

  const updateAddressBook = useCallback(
    (addresses: { address: string; id: string; org_id: string; name: string }[]) => {
      setAddressBookByTeamId(prev => {
        const newAddressBookByTeamId = { ...prev }
        if (!newAddressBookByTeamId[selectedMultisig.orgId]) newAddressBookByTeamId[selectedMultisig.orgId] = []

        addresses.forEach(({ id, name, address, org_id }) => {
          try {
            const parsedAddress = Address.fromSs58(address)
            if (parsedAddress) {
              let addressesOfTeam = newAddressBookByTeamId[org_id] ?? []
              const conflict = addressesOfTeam.find(contact => contact.address.isEqual(parsedAddress))
              if (conflict) return
              addressesOfTeam = [...addressesOfTeam, { id, name, orgId: org_id, address: parsedAddress }]
              newAddressBookByTeamId[org_id] = addressesOfTeam
            }
          } catch (e) {
            console.error('Failed to parse contact:')
            console.error(e)
          }
        })

        if (isEqual(prev, newAddressBookByTeamId)) return prev
        return newAddressBookByTeamId
      })
    },
    [selectedMultisig.orgId, setAddressBookByTeamId]
  )

  const { data, loading } = useQuery<{
    address: { address: string; id: string; org_id: string; name: string }[]
  }>(ADDRESSES_QUERY, {
    variables: {
      orgId: selectedMultisig.orgId,
    },
    pollInterval: 10000,
    skip: !selectedAccount || selectedMultisig.id === DUMMY_MULTISIG_ID,
    notifyOnNetworkStatusChange: true,
  })

  useEffect(() => {
    if (data?.address) updateAddressBook(data.address)
  }, [data?.address, updateAddressBook])

  useEffect(() => {
    setLoading(loading)
  }, [loading, setLoading])

  return null
}

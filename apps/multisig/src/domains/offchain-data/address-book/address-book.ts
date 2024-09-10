import { useCallback, useEffect } from 'react'
import { atom, selector, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { selectedAccountState } from '../../auth'
import { DUMMY_MULTISIG_ID, useSelectedMultisig } from '../../multisig'
import { gql } from 'graphql-tag'
import { Address } from '@util/addresses'
import { isEqual } from 'lodash'
import { useMutation, useQuery } from '@apollo/client'
import { captureException } from '@sentry/react'
import { useToast } from '@components/ui/use-toast'
import { useQueryClient } from '@tanstack/react-query'

const ADDRESSES_BY_ORG_ID = gql`
  query AddressesByOrgId($orgId: uuid!) {
    address(where: { org_id: { _eq: $orgId } }, order_by: { name: asc }, limit: 1000) {
      id
      name
      address
      team_id
      org_id
      category {
        id
        name
      }
      sub_category {
        id
        name
      }
    }
  }
`

export type Category = {
  id: string
  name: string
}

export type Subcategory = {
  id: string
  name: string
}

export type Contact = {
  id: string
  name: string
  address: Address
  orgId: string
  category?: Category
  sub_category?: Subcategory
}

export const addressBookLoadingState = atom<boolean>({
  key: 'addressBookLoadingState',
  default: false,
})

export const addressBookByOrgIdState = atom<Record<string, Contact[]>>({
  key: 'addressBookByOrgIdState',
  default: {},
})

// allow efficient lookup of contacts by address
export const addressBookByOrgIdMapState = selector({
  key: 'addressBookByOrgIdMap',
  get: ({ get }) => {
    const addressBookByOrgId = get(addressBookByOrgIdState)

    const map = {} as Record<string, Record<string, Contact>>

    Object.entries(addressBookByOrgId).forEach(([orgId, contacts]) => {
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
  const addressBookByOrgId = useRecoilValue(addressBookByOrgIdState)
  const addressBookByOrgIdMap = useRecoilValue(addressBookByOrgIdMapState)
  const [selectedMultisig] = useSelectedMultisig()

  if (selectedMultisig.id === DUMMY_MULTISIG_ID) return { contacts: [], contactsByAddress: {}, loading: false }

  return {
    contacts: addressBookByOrgId[selectedMultisig.orgId],
    contactsByAddress: addressBookByOrgIdMap[selectedMultisig.orgId] ?? {},
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
  const setAddressBookByOrgId = useSetRecoilState(addressBookByOrgIdState)
  const [mutate, { loading, error }] = useMutation(CREATE_ADDRESS_MUTATION, {
    onCompleted: data => {
      const { id, name, address, org_id } = data.insert_address_one
      setAddressBookByOrgId(prev => {
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
  const [addressBookByOrgId, setAddressBookByOrgId] = useRecoilState(addressBookByOrgIdState)
  const queryClient = useQueryClient()
  const [selectedMultisig] = useSelectedMultisig()

  const [mutate, { loading: deleting }] = useMutation(gql`
    mutation DeleteAddress($id: uuid!) {
      delete_address_by_pk(id: $id) {
        id
        org_id
      }
    }
  `)

  const deleteContact = useCallback(
    async (id: string, pagination?: { pageIndex: number; pageSize: number }, onSuccess?: () => void) => {
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

        let addresses = addressBookByOrgId[orgId] ?? []
        const stillInList = addresses.find(contact => contact.id === id)

        if (stillInList) {
          addresses = addresses.filter(contact => contact.id !== id)
          setAddressBookByOrgId({ ...addressBookByOrgId, [orgId]: addresses })
        }

        if (onSuccess) {
          onSuccess()
        }

        queryClient.invalidateQueries({ queryKey: ['addresses', selectedMultisig.id, pagination] })

        // inform caller that contact was deleted
        return true
      } catch (e) {
        console.error(e)
        return false
      }
    },
    [addressBookByOrgId, mutate, queryClient, selectedMultisig.id, setAddressBookByOrgId, toast]
  )

  return { deleteContact, deleting }
}

export const AddressBookWatcher = () => {
  const selectedAccount = useRecoilValue(selectedAccountState)
  const setLoading = useSetRecoilState(addressBookLoadingState)
  const [selectedMultisig] = useSelectedMultisig()
  const setAddressBookByOrgId = useSetRecoilState(addressBookByOrgIdState)

  const updateAddressBook = useCallback(
    (addresses: { address: string; id: string; org_id: string; name: string }[]) => {
      setAddressBookByOrgId(prev => {
        const newAddressBookByOrgId = { ...prev }
        if (!newAddressBookByOrgId[selectedMultisig.orgId]) newAddressBookByOrgId[selectedMultisig.orgId] = []

        addresses.forEach(({ address, org_id, ...rest }) => {
          try {
            const parsedAddress = Address.fromSs58(address)
            if (parsedAddress) {
              let addressesOfOrg = newAddressBookByOrgId[org_id] ?? []
              const conflict = addressesOfOrg.find(contact => contact.address.isEqual(parsedAddress))
              if (conflict) return
              addressesOfOrg = [...addressesOfOrg, { orgId: org_id, address: parsedAddress, ...rest }]
              newAddressBookByOrgId[org_id] = addressesOfOrg
            }
          } catch (e) {
            console.error('Failed to parse contact:')
            console.error(e)
          }
        })

        if (isEqual(prev, newAddressBookByOrgId)) return prev
        return newAddressBookByOrgId
      })
    },
    [selectedMultisig.orgId, setAddressBookByOrgId]
  )

  const { data, loading } = useQuery<{
    address: { address: string; id: string; org_id: string; name: string }[]
  }>(ADDRESSES_BY_ORG_ID, {
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

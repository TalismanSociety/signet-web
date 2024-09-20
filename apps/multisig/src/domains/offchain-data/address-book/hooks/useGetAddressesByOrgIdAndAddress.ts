import { requestSignetBackend } from '@domains/offchain-data/hasura'
import { selectedAccountState } from '@domains/auth'
import { SignedInAccount } from '@domains/auth'
import { useRecoilValue } from 'recoil'
import { useQuery } from '@tanstack/react-query'
import { ADDRESSES_BY_ORG_ID_AND_ADDRESS } from '@domains/offchain-data/address-book/queries/queries'
import { useSelectedMultisig } from '@domains/multisig'
import { Address } from '@util/addresses'

import { Contact, ContactIO } from '../types'

const fetchGraphQLData = async ({
  orgId,
  addresses,
  selectedAccount,
}: {
  orgId: string
  addresses: string[]
  selectedAccount: SignedInAccount
}): Promise<Contact[]> => {
  const { data } = await requestSignetBackend(
    ADDRESSES_BY_ORG_ID_AND_ADDRESS,
    {
      orgId,
      addresses,
    },
    selectedAccount
  )

  return (
    data.address?.map((contact: ContactIO) => ({
      ...contact,
      address: Address.fromSs58(contact.address),
      type: 'Contacts',
    })) ?? []
  )
}

const useGetAddressesByOrgIdAndAddress = (addresses: string[]) => {
  const selectedAccount = useRecoilValue(selectedAccountState)
  const [selectedMultisig] = useSelectedMultisig()
  return useQuery({
    queryKey: ['addresses', selectedMultisig.id, addresses],
    queryFn: async () =>
      fetchGraphQLData({ orgId: selectedMultisig.orgId, addresses, selectedAccount: selectedAccount! }),
    enabled: !!selectedAccount && addresses.length > 0,
  })
}

export default useGetAddressesByOrgIdAndAddress

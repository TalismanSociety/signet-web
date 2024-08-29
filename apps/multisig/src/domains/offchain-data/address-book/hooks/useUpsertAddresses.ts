import { requestSignetBackend } from '@domains/offchain-data/hasura'
import { selectedAccountState } from '@domains/auth'
import { SignedInAccount } from '@domains/auth'
import { useRecoilValue } from 'recoil'
import { keepPreviousData, useQuery, useMutation } from '@tanstack/react-query'
import { UPSERT_ADDRESSES } from '@domains/offchain-data/address-book/queries/queries'
import { useSelectedMultisig } from '@domains/multisig'
import { Address } from '@util/addresses'
// import { Contact } from '../address-book'
import { ContactAddress } from './useGetPaginatedAddressesByOrgId'
import { useQueryClient } from '@tanstack/react-query'

const fetchGraphQLData = async ({
  orgId,
  teamId,
  selectedAccount,
  addressesInput,
}: {
  orgId: string
  teamId: string
  selectedAccount: SignedInAccount
  addressesInput: ContactAddress[] | undefined
}) => {
  const { data } = await requestSignetBackend(
    UPSERT_ADDRESSES,
    {
      orgId,
      teamId,
      addressesInput,
    },
    selectedAccount
  )
  console.log({ data })
}

const useUpsertAddresses = (onSuccess?: () => void) => {
  const selectedAccount = useRecoilValue(selectedAccountState)
  const [selectedMultisig] = useSelectedMultisig()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (addressesInput: ContactAddress[] | undefined) =>
      fetchGraphQLData({
        orgId: selectedMultisig.orgId,
        teamId: selectedMultisig.id,
        selectedAccount: selectedAccount!,
        addressesInput,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [selectedMultisig.id, { pageIndex: 0, pageSize: 10 }] })
      if (onSuccess) {
        onSuccess()
      }
    },
  })
}

export default useUpsertAddresses

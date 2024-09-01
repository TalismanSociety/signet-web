import { requestSignetBackend } from '@domains/offchain-data/hasura'
import { selectedAccountState } from '@domains/auth'
import { SignedInAccount } from '@domains/auth'
import { useRecoilValue } from 'recoil'
import { useMutation } from '@tanstack/react-query'
import { UPSERT_ADDRESSES } from '@domains/offchain-data/address-book/queries/queries'
import { useSelectedMultisig } from '@domains/multisig'
import { ContactAddress } from './useGetPaginatedAddressesByOrgId'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@components/ui/use-toast'

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
  const { data, error } = await requestSignetBackend(
    UPSERT_ADDRESSES,
    {
      orgId,
      teamId,
      addressesInput,
    },
    selectedAccount
  )
  if (error) {
    console.log({ error })
    throw new Error('Failed to save addresses')
  }
  return data
}

const useUpsertAddresses = (onSuccess?: () => void) => {
  const selectedAccount = useRecoilValue(selectedAccountState)
  const [selectedMultisig] = useSelectedMultisig()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (addressesInput: ContactAddress[] | undefined) =>
      fetchGraphQLData({
        orgId: selectedMultisig.orgId,
        teamId: selectedMultisig.id,
        selectedAccount: selectedAccount!,
        addressesInput,
      }),
    onSuccess: res => {
      queryClient.invalidateQueries({ queryKey: [selectedMultisig.id, { pageIndex: 0, pageSize: 10 }] })
      if (onSuccess) {
        onSuccess()
      }
    },
    onError: e => {
      console.log(e)
      toast({
        title: e.message,
        description: 'Please try again.',
      })
    },
  })
}

export default useUpsertAddresses

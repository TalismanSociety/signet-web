import { useCallback } from 'react'
import { useSelectedMultisig } from '../../multisig'
import { gql } from 'graphql-tag'
import { useMutation } from '@apollo/client'
import { captureException } from '@sentry/react'
import { useToast } from '@components/ui/use-toast'
import { useQueryClient } from '@tanstack/react-query'

export const useDeleteContact = () => {
  const { toast } = useToast()
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
    [mutate, queryClient, selectedMultisig.id, toast]
  )

  return { deleteContact, deleting }
}

import { useApolloClient, useMutation } from '@apollo/client'
import { ChangeConfigDetails, useSelectedMultisig } from '@domains/multisig'
import { gql } from 'graphql-tag'
import { useCallback } from 'react'

export type TxMetadataDraftRaw = {
  id: string
  team_id: string
  creator: {
    id: string
    identifier: string
    identifier_type: string
  }
  created_at: string
  change_config_details: any
  call_data: string
  description: string
}

export const GET_TX_METADATA_DRAFT_QUERY = gql`
  query GetDraftTransactions($teamId: uuid!) {
    tx_metadata_draft(where: { team_id: { _eq: $teamId }, status: { _eq: "draft" } }, order_by: { created_at: desc }) {
      id
      team_id
      creator {
        id
        identifier
        identifier_type
      }
      created_at
      change_config_details
      call_data
      description
    }
  }
`

const SAVE_DRAFT_METADATA = gql`
  mutation SaveDraftMutation($teamId: uuid!, $callData: String!, $changeConfigDetails: json, $description: String!) {
    insert_tx_metadata_draft_one(
      object: {
        team_id: $teamId
        call_data: $callData
        change_config_details: $changeConfigDetails
        description: $description
      }
    ) {
      id
      team_id
      creator {
        id
        identifier
        identifier_type
      }
      created_at
      change_config_details
      call_data
      description
    }
  }
`

type SaveDraftProps = {
  description: string
  teamId: string
  callData: string
  changeConfigDetails: {
    newThreshold: number
    newMembers: string[]
  } | null
}

export const useSaveDraftMetadata = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const client = useApolloClient()
  const [mutateSaveDraft, { loading, data, error }] = useMutation<
    { insert_tx_metadata_draft_one: TxMetadataDraftRaw },
    SaveDraftProps
  >(SAVE_DRAFT_METADATA, {
    onCompleted: (data, clientOptions) => {
      console.log(data, clientOptions)
      if (!clientOptions || !clientOptions.client) return
      const curRes = clientOptions.client.readQuery({
        query: GET_TX_METADATA_DRAFT_QUERY,
        variables: {
          teamId: selectedMultisig.id,
        },
      })

      console.log(curRes)
    },
  })

  const saveDraft = useCallback(
    async (
      props: Omit<SaveDraftProps, 'changeConfigDetails'> & {
        changeConfigDetails?: ChangeConfigDetails
      }
    ) => {
      const { changeConfigDetails, ...rest } = props
      const saved = await mutateSaveDraft({
        variables: {
          ...rest,
          changeConfigDetails: changeConfigDetails
            ? {
                newThreshold: changeConfigDetails.newThreshold,
                newMembers: changeConfigDetails.newMembers.map(a => a.toSs58(selectedMultisig.chain)),
              }
            : null,
        },
      })

      // update via cache to skip for faster feedback
      if (saved.data) {
        const currentQuery = client.readQuery({
          query: GET_TX_METADATA_DRAFT_QUERY,
          variables: { teamId: selectedMultisig.id },
        })

        const newDrafts = [saved.data.insert_tx_metadata_draft_one, ...(currentQuery?.tx_metadata_draft ?? [])]
        client.writeQuery({
          query: GET_TX_METADATA_DRAFT_QUERY,
          variables: { teamId: selectedMultisig.id },
          data: { tx_metadata_draft: newDrafts },
        })
      }
      return saved
    },
    [client, mutateSaveDraft, selectedMultisig.chain, selectedMultisig.id]
  )
  return { saveDraft, loading, data, error }
}

const UPDATE_DRAFT_METADATA = gql`
  mutation DeleteDraftMutation($id: uuid!, $status: String!) {
    update_tx_metadata_draft_by_pk(pk_columns: { id: $id }, _set: { status: $status }) {
      id
      status
    }
  }
`

export const useDeleteDraftMetadata = () => {
  const client = useApolloClient()
  const [selectedMultisig] = useSelectedMultisig()
  const [mutateUpdateDraft, { loading }] = useMutation(UPDATE_DRAFT_METADATA)

  const deleteDraft = useCallback(
    async (id: string, status = 'cancelled') => {
      const deleted = await mutateUpdateDraft({ variables: { id, status } })

      const currentQuery = client.readQuery({
        query: GET_TX_METADATA_DRAFT_QUERY,
        variables: { teamId: selectedMultisig.id },
      })

      if (!currentQuery?.tx_metadata_draft) return deleted

      // this shouldnt happen
      if (deleted.data?.update_tx_metadata_draft_by_pk?.status !== status) return deleted

      const newDrafts = currentQuery.tx_metadata_draft.filter((t: TxMetadataDraftRaw) => t.id !== id)

      client.writeQuery({
        query: GET_TX_METADATA_DRAFT_QUERY,
        variables: { teamId: selectedMultisig.id },
        data: { tx_metadata_draft: newDrafts },
      })

      return deleted
    },
    [client, mutateUpdateDraft, selectedMultisig.id]
  )

  return {
    deleteDraft,
    loading,
  }
}

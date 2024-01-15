import { useMutation } from '@apollo/client'
import { ChangeConfigDetails, useSelectedMultisig } from '@domains/multisig'
import { gql } from 'graphql-tag'
import { useCallback } from 'react'

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
  }
}

export const useSaveDraftMetadata = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const [mutateSaveDraft, { loading, data, error }] = useMutation<SaveDraftProps>(SAVE_DRAFT_METADATA)

  const saveDraft = useCallback(
    (
      props: Omit<SaveDraftProps, 'changeConfigDetails'> & {
        changeConfigDetails?: ChangeConfigDetails
      }
    ) => {
      const { changeConfigDetails, ...rest } = props
      return mutateSaveDraft({
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
    },
    [mutateSaveDraft, selectedMultisig.chain]
  )
  return { saveDraft, loading, data, error }
}

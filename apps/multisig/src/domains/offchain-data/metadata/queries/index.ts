import { gql } from 'graphql-tag'

export const TXS_METADATA_BY_TIMEPOINTS = gql`
  query TxMetadataByTimepoints($teamId: uuid!, $chainId: String!) {
    tx_metadata(where: { team_id: { _eq: $teamId }, chain: { _eq: $chainId } }, order_by: { created: desc }) {
      team_id
      timepoint_height
      timepoint_index
      chain
      call_data
      change_config_details
      created
      description
      other_metadata
    }
  }
`

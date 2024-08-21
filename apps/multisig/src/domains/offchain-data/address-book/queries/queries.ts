import { gql } from 'graphql-tag'

export const PAGINATED_ADDRESSES_BY_ORG_ID = gql`
  query PaginatedAddressesByOrgId($orgId: uuid!, $limit: Int, $offset: Int, $search: String) {
    address_aggregate(
      where: { org_id: { _eq: $orgId }, _or: [{ name: { _ilike: $search } }, { address: { _ilike: $search } }] }
    ) {
      aggregate {
        count
      }
    }
    address(
      where: { org_id: { _eq: $orgId }, _or: [{ name: { _ilike: $search } }, { address: { _ilike: $search } }] }
      order_by: { name: asc }
      limit: $limit
      offset: $offset
    ) {
      org_id
      id
      name
      address
      team_id
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

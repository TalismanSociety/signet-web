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

export const PAGINATED_CATEGORIES_BY_ORG_ID = gql`
  query PaginatedCategoriesByOrgId($orgId: uuid!, $limit: Int!, $offset: Int!, $search: String) {
    category_aggregate(where: { org_id: { _eq: $orgId }, _or: { name: { _ilike: $search } } }) {
      aggregate {
        count
      }
    }
    category(limit: $limit, offset: $offset, where: { org_id: { _eq: $orgId }, _or: { name: { _ilike: $search } } }) {
      id
      org_id
      name
      sub_categories {
        id
        name
      }
    }
  }
`

export const PAGINATED_SUB_CATEGORIES_BY_ORG_ID = gql`
  query PaginatedSubcategoriesByCategoryId($categoryId: uuid!, $limit: Int!, $offset: Int!, $search: String) {
    sub_category_aggregate(where: { category_id: { _eq: $categoryId }, _or: { name: { _ilike: $search } } }) {
      aggregate {
        count
      }
    }
    sub_category(
      limit: $limit
      offset: $offset
      where: { category_id: { _eq: $categoryId }, _or: { name: { _ilike: $search } } }
    ) {
      id
      org_id
      name
    }
  }
`

export const UPSERT_ADDRESSES = gql`
  mutation UpsertAddressesMutation($orgId: String!, $teamId: String!, $addressesInput: [AddressInput!]!) {
    UpsertAddresses(addressesInput: { addresses: $addressesInput, org_id: $orgId, team_id: $teamId }) {
      success
      totalUpsertedAddresses
    }
  }
`

import { Address } from '@util/addresses'

export type Category = {
  id: string
  name: string
}

export type Subcategory = {
  id: string
  name: string
}

export type AddressType = 'Extension' | 'Contacts' | 'Vault' | 'Smart Contract' | undefined

export type Contact = {
  id: string
  name: string
  address: Address
  category?: Category
  sub_category?: Subcategory
  team_id?: string
  org_id: string
  type: AddressType
}
export type ContactIO = Omit<Contact, 'address' | 'type'> & { address: string }

export type PaginatedAddresses = {
  rows: Contact[]
  pageCount: number
  rowCount: number
}

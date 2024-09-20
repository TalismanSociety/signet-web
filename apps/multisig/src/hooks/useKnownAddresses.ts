import { useRecoilValue } from 'recoil'
import { AddressWithName, AddressType } from '../components/AddressInput'
import { accountsState } from '../domains/extension'
import { useMemo } from 'react'
import { useSelectedMultisig } from '@domains/multisig'
import { useSmartContracts } from '../domains/offchain-data/smart-contract'
import { Contact } from '../domains/offchain-data/address-book/address-book'
import useGetAddressesByOrgIdAndAddress from '../domains/offchain-data/address-book/hooks/useGetAddressesByOrgIdAndAddress'

export type ContactWithNameAndCategory = Partial<Contact> & AddressWithName

export const useKnownAddresses = ({
  includeSelectedMultisig,
  includeContracts,
  shouldExcludeExtensionContacts = false,
  addresses,
}: {
  includeSelectedMultisig?: boolean
  includeContracts?: boolean
  shouldExcludeExtensionContacts?: boolean
  addresses?: string[]
} = {}): {
  addresses: ContactWithNameAndCategory[]
  contactByAddress: Record<string, ContactWithNameAndCategory>
  isLoading: boolean
} => {
  const extensionAccounts = useRecoilValue(accountsState)
  const [multisig] = useSelectedMultisig()
  const { contracts } = useSmartContracts()
  const { data: addressBookData, isLoading } = useGetAddressesByOrgIdAndAddress(addresses ?? [])

  const extensionContacts = useMemo(() => {
    if (shouldExcludeExtensionContacts) return []
    return extensionAccounts.reduce<AddressWithName[]>((acc, { address, meta: { name = '' } = {} }) => {
      if (multisig.isEthereumAccount === address.isEthereum) {
        acc.push({
          address,
          name,
          type: 'Extension',
          extensionName: name,
        })
      }
      return acc
    }, [])
  }, [extensionAccounts, multisig.isEthereumAccount, shouldExcludeExtensionContacts])

  const addressBookContacts = useMemo(() => {
    if (!addressBookData?.length) return []

    return addressBookData.reduce<ContactWithNameAndCategory[]>((acc, { address, name, category, sub_category }) => {
      if (multisig.isEthereumAccount === address.isEthereum) {
        acc.push({
          address,
          name,
          category,
          sub_category,

          type: 'Contacts',
        })
      }
      return acc
    }, [])
  }, [addressBookData, multisig.isEthereumAccount])

  const combinedList = useMemo(() => {
    let list = extensionContacts

    addressBookContacts.forEach(contact => {
      const extensionIndex = list.findIndex(item => item.address.isEqual(contact.address))

      if (extensionIndex > -1) {
        // address is in address book, but is also user's extension account
        // we will show the address book name, but keep track of the extension name
        const extensionName = list[extensionIndex]!.extensionName
        list[extensionIndex] = contact
        list[extensionIndex]!.extensionName = extensionName
      } else {
        list.push(contact)
      }
    })

    list = list.sort((a, b) => {
      // list extension accounts without address book name first
      if (a.type === 'Extension' && b.type === 'Extension') return a.name.localeCompare(b.name)
      if (a.type === 'Extension') return -1
      if (b.type === 'Extension') return 1

      // sort the rest by name
      return a.name.localeCompare(b.name)
    })

    if (includeSelectedMultisig) {
      list = [
        {
          address: multisig.proxyAddress,
          name: `${multisig.name} (Proxied)`,
          type: 'Vault',
        },
        {
          address: multisig.multisigAddress,
          name: `${multisig.name} (Multisig)`,
          type: 'Vault',
        },
        ...list,
      ]
    }

    if (includeContracts && contracts) {
      list = [
        ...list,
        ...contracts.map(({ address, name }) => ({
          address,
          name,
          type: 'Smart Contract' as AddressType,
        })),
      ]
    }

    return list
  }, [
    addressBookContacts,
    contracts,
    extensionContacts,
    includeContracts,
    includeSelectedMultisig,
    multisig.multisigAddress,
    multisig.name,
    multisig.proxyAddress,
  ])

  const contactByAddress = useMemo(() => {
    return combinedList.reduce((acc, contact) => {
      const addressString = contact.address.toSs58()
      if (!acc[addressString]) acc[addressString] = contact
      return acc
    }, {} as Record<string, ContactWithNameAndCategory>)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinedList, combinedList.length]) // added combinedList.length to fix stale combinedList value

  return { addresses: combinedList, contactByAddress, isLoading }
}

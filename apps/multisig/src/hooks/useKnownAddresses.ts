import { useRecoilValue } from 'recoil'
import { AddressWithName } from '../components/AddressInput'
import { InjectedAccount, accountsState } from '../domains/extension'
import { addressBookByTeamIdState } from '../domains/offchain-data'
import { useMemo } from 'react'
import { addressToAzeroIdState } from '@hooks/useResolveAddressAzeroIdMap'

export const useKnownAddresses = (
  teamId?: string
): {
  addresses: AddressWithName[]
  contactByAddress: Record<string, AddressWithName>
} => {
  const extensionAccounts = useRecoilValue(accountsState)
  const addressBookByTeamId = useRecoilValue(addressBookByTeamIdState)
  const addressToAzeroId = useRecoilValue(addressToAzeroIdState)

  const extensionAccountsExtended: InjectedAccount[] = useMemo(() => {
    return extensionAccounts.map(account => {
      const stringAddress = account.address.toSs58()
      return {
        ...account,
        a0Id: addressToAzeroId[stringAddress],
      }
    })
  }, [addressToAzeroId, extensionAccounts])

  const extensionContacts: AddressWithName[] = extensionAccountsExtended.map(({ address, meta, a0Id }) => ({
    address,
    name: meta.name ?? '',
    type: 'Extension',
    a0Id: a0Id ?? addressToAzeroId[address.toSs58()],
    extensionName: meta.name,
  }))

  const addressBookContacts = useMemo(() => {
    if (!teamId) return []

    const addresses = addressBookByTeamId[teamId ?? ''] ?? []

    return addresses.map(({ address, name, a0Id }) => ({
      address,
      name,
      a0Id,
      type: 'Contacts',
    }))
  }, [addressBookByTeamId, teamId])

  const combinedList = useMemo(() => {
    const list = extensionContacts

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

    return list.sort((a, b) => {
      // list extension accounts without address book name first
      if (a.type === 'Extension' && b.type === 'Extension') return a.name.localeCompare(b.name)
      if (a.type === 'Extension') return -1
      if (b.type === 'Extension') return 1

      // sort the rest by name
      return a.name.localeCompare(b.name)
    })
  }, [addressBookContacts, extensionContacts])

  const contactByAddress = useMemo(() => {
    return combinedList.reduce((acc, contact) => {
      const addressString = contact.address.toSs58()
      if (!acc[addressString]) acc[addressString] = contact
      return acc
    }, {} as Record<string, AddressWithName>)
  }, [combinedList])

  return { addresses: combinedList, contactByAddress }
}

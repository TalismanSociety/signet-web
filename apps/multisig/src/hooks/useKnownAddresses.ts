import { useRecoilValue } from 'recoil'
import { AddressWithName } from '../components/AddressInput'
import { accountsState } from '../domains/extension'
import { addressBookByTeamIdState } from '../domains/offchain-data'
import { useMemo } from 'react'
import { useSelectedMultisig } from '@domains/multisig'
import { useSmartContracts } from '../domains/offchain-data/smart-contract'

export const useKnownAddresses = (
  teamId?: string,
  {
    includeSelectedMultisig = false,
    includeContracts = false,
  }: { includeSelectedMultisig?: boolean; includeContracts?: boolean } = {}
): { addresses: AddressWithName[]; contactByAddress: Record<string, AddressWithName> } => {
  const extensionAccounts = useRecoilValue(accountsState)
  const addressBookByTeamId = useRecoilValue(addressBookByTeamIdState)
  const [multisig] = useSelectedMultisig()
  const { contracts } = useSmartContracts()

  const extensionContacts = extensionAccounts.reduce<AddressWithName[]>(
    (acc, { address, meta: { name = '' } = {} }) => {
      if (multisig.isEthereumAccount === address.isEthereum) {
        acc.push({
          address,
          name,
          type: 'Extension',
          extensionName: name,
        })
      }
      return acc
    },
    []
  )

  const addressBookContacts = useMemo(() => {
    if (!teamId) return []

    const addresses = addressBookByTeamId[teamId ?? ''] ?? []

    return addresses.map(({ address, name }) => ({
      address,
      name,
      type: 'Contacts',
    }))
  }, [addressBookByTeamId, teamId])

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
          type: 'Smart Contract',
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
    }, {} as Record<string, AddressWithName>)
  }, [combinedList])

  return { addresses: combinedList, contactByAddress }
}

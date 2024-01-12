import { accountsAzeroIdState } from '@domains/extension'
import { Address } from '@util/addresses'
import { getAzeroId } from '@util/azeroid'
import { useEffect } from 'react'
import { useRecoilState } from 'recoil'

export function useAddressAzeroIdMap(addresses: Address[]) {
  const [accountsAzeroIds, setAccountsAzeroIds] = useRecoilState(accountsAzeroIdState)

  useEffect(() => {
    async function getMemberAzeroIds(addresses: Address[]) {
      let memberAzeroIdMap = {}
      for (const address of addresses) {
        const stringAddress = address.toSs58()
        if (stringAddress) {
          memberAzeroIdMap = {
            ...memberAzeroIdMap,
            [stringAddress]: await getAzeroId(stringAddress),
          }
        }
      }
      setAccountsAzeroIds(memberAzeroIdMap)
    }

    getMemberAzeroIds(addresses)
  }, [addresses, setAccountsAzeroIds])

  return accountsAzeroIds
}

import { AddressBookWatcher } from './address-book/address-book'
import { TxMetadataWatcher } from './metadata'
import { OrganisationsWatcher } from './organisation'
import { SmartContractsWatcher } from './smart-contract'

export const OffchainDataWatcher: React.FC = () => (
  <>
    <AddressBookWatcher />
    <SmartContractsWatcher />
    <TxMetadataWatcher />
    <OrganisationsWatcher />
  </>
)

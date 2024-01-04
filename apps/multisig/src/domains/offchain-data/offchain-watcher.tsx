import { AddressBookWatcher } from './address-book'
import { TxMetadataWatcher } from './metadata'
import { SmartContractsWatcher } from './smart-contract'
import { TeamsWatcher } from './teams'

export const OffchainDataWatcher: React.FC = () => (
  <>
    <AddressBookWatcher />
    <SmartContractsWatcher />
    <TeamsWatcher />
    <TxMetadataWatcher />
  </>
)

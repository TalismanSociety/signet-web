import { TxMetadataWatcher } from './metadata'
import { OrganisationsWatcher } from './organisation'
import { SmartContractsWatcher } from './smart-contract'

export const OffchainDataWatcher: React.FC = () => (
  <>
    <SmartContractsWatcher />
    <TxMetadataWatcher />
    <OrganisationsWatcher />
  </>
)

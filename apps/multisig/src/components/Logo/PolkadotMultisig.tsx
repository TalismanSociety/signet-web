import { ReactComponent as Flat } from './polkadot-multisig-flat.svg'
import { ReactComponent as Wrapped } from './polkadot-multisig-wrapped.svg'

export const PolkadotMultisigLogo: React.FC<{ wrapped?: boolean } & React.HTMLAttributes<HTMLDivElement>> = ({
  wrapped,
  ...props
}) => <div {...props}>{wrapped ? <Wrapped /> : <Flat />}</div>

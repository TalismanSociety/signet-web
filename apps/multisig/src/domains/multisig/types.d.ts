import { Address } from '@util/addresses'
import { Chain } from '../chains'

export interface Multisig {
  id: string
  orgId: string
  name: string
  description: string
  chain: Chain
  multisigAddress: Address
  proxyAddress: Address
  signers: Address[]
  threshold: number
  collaborators: { id: string; address: Address }[]
}

export type ProxyDefinition = {
  delegate: Address
  proxyType: string
  delay: number
  duration: number
}

/**
 * @property proxies - list of proxies that `proxyAccount` delegated to `multisigAddress`
 * @property allProxies - list of all proxies that `proxyAccount` has delegated to
 */
export type MultisigWithExtraData = {
  proxies?: ProxyDefinition[]
  allProxies?: ProxyDefinition[]
  isCollaborator: (address: Address) => boolean
  isSigner: (address: Address) => boolean
} & Multisig

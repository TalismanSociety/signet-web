import { Address } from '@util/addresses'
import { recoilPersist } from 'recoil-persist'

import { supportedChains } from './chains'
import { Multisig } from './multisig'

function setAddressPrototype(a: any): void {
  a.bytes = new Uint8Array(Object.values(a.bytes))
  Object.setPrototypeOf(a, Address.prototype)
}

// Need to manually set the prototype of deserialized Address instances.
type ParsedLocalStorage = { Multisigs: Multisig[] } | { SelectedMultisig: Multisig } | { AllowExtension: boolean }

function initMultisig(m: Multisig) {
  setAddressPrototype(m.multisigAddress)
  setAddressPrototype(m.proxyAddress)
  m.signers.forEach(s => setAddressPrototype(s))
  m.collaborators.forEach(u => setAddressPrototype(u.address))
  // Refresh Chain definitions if they have changed
  const latestChain = supportedChains.find(c => c.id === m.chain.id)
  if (latestChain) m.chain = latestChain
  if (!m.id) m.id = `${m.multisigAddress.toSs58()}-${m.proxyAddress.toSs58()}-${m.chain.id}`
}

export default recoilPersist({
  converter: {
    parse: (str: string) => {
      const parsed: ParsedLocalStorage = JSON.parse(str)

      if ('Multisigs' in parsed) {
        parsed.Multisigs = []
      }

      if ('SelectedMultisig' in parsed) {
        initMultisig(parsed.SelectedMultisig)
      }

      if ('AllowExtension' in parsed) {
        // noop
      }

      return parsed
    },
    stringify: (obj: any) => JSON.stringify(obj),
  },
}).persistAtom

import { Chain } from '@domains/chains'
import { createKeyMulti, decodeAddress, encodeAddress, sortAddresses } from '@polkadot/util-crypto'
import truncateMiddle from 'truncate-middle'
const { hexToU8a, isHex, u8aToHex } = require('@polkadot/util')

const sortEthereumAddresses = (addresses: Address[]): Address[] => {
  const addressStr = addresses.map(a => a.toSs58().toLowerCase())
  const sortedAddress = addressStr
    ?.sort((a, b) => {
      return a.localeCompare(b)
    })
    .map(a => Address.fromSs58(a) as Address)

  return sortedAddress
}

// Represent addresses as bytes except for when we need to display them to the user.
// Allows us to confidently do stuff like equality checks, don't need to worry about SS52 encoding.
export class Address {
  readonly bytes: Uint8Array

  constructor(bytes: Uint8Array) {
    if (bytes.length === 32 || bytes.length === 20) {
      this.bytes = bytes

      if (bytes.length === 20) {
        // TODO: check if this is valid ethereum address
      }
      return
    }
    throw new Error('Address must be 32/20 bytes!')
  }

  get isEthereum(): boolean {
    return this.bytes.length === 20
  }

  static fromSs58(addressCandidate: string): Address | false {
    try {
      const bytes = isHex(addressCandidate)
        ? (hexToU8a(addressCandidate) as Uint8Array)
        : decodeAddress(addressCandidate, false)
      return new Address(bytes)
    } catch (error) {
      return false
    }
  }

  static fromPubKey(pubKey: string): Address | false {
    const bytes = new Uint8Array(hexToU8a(pubKey))
    if (bytes.length !== 32) return false
    return new Address(bytes)
  }

  static sortAddresses(addresses: Address[]): Address[] {
    if (addresses[0]?.isEthereum) return sortEthereumAddresses(addresses)
    return sortAddresses(addresses.map(a => a.bytes)).map(a => Address.fromSs58(a) as Address)
  }

  isEqual(other: Address): boolean {
    return this.bytes.every((byte, index) => byte === other.bytes[index])
  }

  /* to generic address if chain is not provided */
  toSs58(chain?: Chain): string {
    if (this.bytes.length === 20) return u8aToHex(this.bytes)
    return encodeAddress(this.bytes, chain?.ss58Prefix)
  }

  toShortSs58(chain?: Chain): string {
    return shortenAddress(this.toSs58(chain))
  }

  toPubKey(): string {
    return u8aToHex(this.bytes)
  }

  toSubscanUrl(chain: Chain): string {
    return `${chain.subscanUrl}account/${this.toSs58(chain)}`
  }
}

const evmToSubstrateAddress = (evmAddress: string) => {
  // Remove the '0x' prefix
  const evmAddressBytes = hexToU8a(evmAddress)

  // Create a 32-byte public key by padding the 20-byte EVM address with zeros
  const substratePublicKey = new Uint8Array(32)
  substratePublicKey.set(evmAddressBytes, 0)

  // Encode the 32-byte key in SS58 format
  const substrateAddress = encodeAddress(substratePublicKey)

  return substrateAddress
}

const substrateToEvmAddress = (substrateAddress: string) => {
  // Decode the SS58 Substrate address to get the 32-byte public key
  const substratePublicKey = decodeAddress(substrateAddress)

  // Extract the first 20 bytes of the public key to get the EVM address
  const evmAddress = u8aToHex(substratePublicKey.slice(0, 20))

  return evmAddress
}

export const toMultisigAddress = (signers: Address[], threshold: number): Address => {
  const isEthAddress = signers[0]?.isEthereum

  if (isEthAddress) {
    const evmSigners = signers.map(s => evmToSubstrateAddress(s.toSs58()))
    const multiAddressBytes = createKeyMulti(evmSigners, threshold)
    const multiAddress = new Address(multiAddressBytes)
    const multiToEvmAddress = substrateToEvmAddress(multiAddress.toSs58())

    return new Address(hexToU8a(multiToEvmAddress))
  } else {
    const multiAddressBytes = createKeyMulti(
      Address.sortAddresses(signers).map(a => a.bytes),
      threshold
    )
    return new Address(multiAddressBytes)
  }
}

export const shortenAddress = (address: string, size: 'long' | 'short' = 'short'): string => {
  const length = size === 'long' ? 7 : 5
  return truncateMiddle(address, length, length, '...')
}

// Sometimes the arg is wrapped in an Id, other times not.
export const parseCallAddressArg = (callAddressArg: string | { Id: string } | { value: string }): string => {
  if (typeof callAddressArg === 'string') {
    if (callAddressArg.startsWith('{')) return parseCallAddressArg(JSON.parse(callAddressArg))
    return callAddressArg
  }

  if ('Id' in callAddressArg) return callAddressArg.Id

  return callAddressArg.value
}

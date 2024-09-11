import { Chain } from '@domains/chains'
import { createKeyMulti, decodeAddress, encodeAddress, sortAddresses } from '@polkadot/util-crypto'
import truncateMiddle from 'truncate-middle'
import { utils } from 'ethers'
const { hexToU8a, isHex, u8aToHex } = require('@polkadot/util')

const sortEthereumAddresses = (addresses: Address[]): Address[] =>
  [...addresses].sort((a, b) => {
    return a.toSs58().localeCompare(b.toSs58())
  })

// Represent addresses as bytes except for when we need to display them to the user.
// Allows us to confidently do stuff like equality checks, don't need to worry about SS52 encoding.
export class Address {
  readonly bytes: Uint8Array

  constructor(bytes: Uint8Array) {
    if (bytes.length === 32 || bytes.length === 20) {
      this.bytes = bytes
      if (bytes.length === 20 && !utils.isAddress(u8aToHex(bytes))) {
        throw new Error('Invalid Ethereum address!')
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

  toShortSs58(chain?: Chain, size?: Size): string {
    return shortenAddress(this.toSs58(chain), size)
  }

  toPubKey(): string {
    // For EVM addresses it returns the address string
    return u8aToHex(this.bytes)
  }

  toSubscanUrl(chain: Chain): string {
    return `${chain.subscanUrl}account/${this.toSs58(chain)}`
  }
}

export const toMultisigAddress = (signers: Address[], threshold: number): Address => {
  const addresses = signers.map(s => s.toSs58())
  let multisigAddress = createKeyMulti(addresses, threshold)

  if (signers[0]?.isEthereum) {
    // For Ethereum chains, the first 20 bytes of the hash indicates the actual address
    multisigAddress = multisigAddress.slice(0, 20)
  }

  return new Address(multisigAddress)
}

type Size = 'sm' | 'md' | 'lg' | 'xl'

export const shortenAddress = (address: string, size: Size = 'sm'): string => {
  const sizes = {
    sm: 5,
    md: 7,
    lg: 9,
    xl: 14,
  }
  const length = sizes[size]
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

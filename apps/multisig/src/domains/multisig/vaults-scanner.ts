import { selectedAccountState } from '@domains/auth'
import { Address, parseCallAddressArg, toMultisigAddress } from '@util/addresses'
import { gql } from 'graphql-request'
import fetchGraphQL from '../../graphql/fetch-graphql'
import { atom, selector, selectorFamily } from 'recoil'
import { Chain, supportedChains } from '@domains/chains'
import { pjsApiSelector } from '@domains/chains/pjs-api'
import persist from '@domains/persist'
import { Team, activeTeamsState } from '@domains/offchain-data'

type RawData = {
  accountExtrinsics: {
    extrinsic: {
      callName: string
      signer: string
      callArgs: any
      block: {
        chainGenesisHash: string
      }
    }
  }[]
}

export type ScannedVault = {
  proxy: string
  proxiedAddress: Address
  multisig: { multisigAddress: Address; signers: Address[]; threshold: number }
  chain: Chain
}

const getTransactionsOfAccount = selectorFamily({
  key: 'getTransactionsOfAccount',
  get: (address: string) => async () => {
    return (await fetchGraphQL(
      gql`
        query GetTransactions($address: String!, $callNameIn: [String!]!) {
          accountExtrinsics(where: { account: { address_eq: $address }, extrinsic: { callName_in: $callNameIn } }) {
            extrinsic {
              callName
              callArgs
              signer
              block {
                chainGenesisHash
              }
            }
          }
        }
      `,
      { address, callNameIn: ['Multisig.approve_as_multi', 'Multisig.as_multi'] },
      'tx-history'
    )) as {
      data: RawData
    }
  },
})

export const vaultsOfAccount = selector({
  key: 'vaultsOfAccount',
  get: async ({ get }) => {
    const selectedAccount = get(selectedAccountState)
    if (!selectedAccount) return
    const { data } = get(getTransactionsOfAccount(selectedAccount.injected.address.toPubKey()))

    const multisigs: Record<string, { multisigAddress: Address; signers: Address[]; threshold: number }> = {}
    const proxiedAccounts: Record<string, { address: Address; chain: Chain }> = {}
    data.accountExtrinsics.forEach(tx => {
      try {
        // get the signer that signed the transaction
        const signer = Address.fromPubKey(parseCallAddressArg(tx.extrinsic.signer))
        if (!signer) throw new Error('Invalid signer')

        // check if the multisig is on a supported chain
        const chain = supportedChains.find(c => c.genesisHash === tx.extrinsic.block.chainGenesisHash)
        if (!chain) throw new Error('Chain not supported')

        // a multisig transaction should have a threshold
        if (typeof tx.extrinsic.callArgs.threshold !== 'number') throw new Error('Threshold not a number')

        // get other signers so we can derive the multisig address
        const otherSignersPubkey = tx.extrinsic.callArgs.otherSignatories ?? []
        const signers = [signer]
        for (const otherSigner of otherSignersPubkey) {
          const nextSigner = Address.fromPubKey(otherSigner)
          if (!nextSigner) throw new Error('Invalid signer from otherSignatories')
          signers.push(nextSigner)
        }

        // derive the multisig address
        const multisigAddress = toMultisigAddress(signers, tx.extrinsic.callArgs.threshold)

        // we only want extrinsics where the searched account is a signer of a multisig
        const isRelevant = signers.some(s => s.isEqual(selectedAccount.injected.address))
        if (!isRelevant) return null

        const innerCall = tx.extrinsic.callArgs.call
        if (!innerCall) throw new Error('No inner call, not a multisig to proxy call')

        if (innerCall.__kind !== 'Proxy' || innerCall.value.__kind !== 'proxy')
          throw new Error('No inner call is not a proxy call')

        // find the real account of the proxy call
        const proxiedAccount = Address.fromPubKey(parseCallAddressArg(innerCall.value.real))
        if (!proxiedAccount) throw new Error('Invalid proxied account')

        multisigs[multisigAddress.toSs58()] = {
          multisigAddress,
          signers,
          threshold: tx.extrinsic.callArgs.threshold,
        }
        proxiedAccounts[proxiedAccount.toSs58()] = {
          address: proxiedAccount,
          chain,
        }
      } catch (e) {
        // some weird extrinsic, ignore
        return null
      }
    })

    // groupd proxied accounts by chain genesis hash
    const proxiedAccountsByChain: Record<string, { address: Address; chain: Chain }[]> = {}
    for (const { address, chain } of Object.values(proxiedAccounts)) {
      if (!proxiedAccountsByChain[chain.genesisHash]) {
        proxiedAccountsByChain[chain.genesisHash] = []
      }
      proxiedAccountsByChain[chain.genesisHash]!.push({ address, chain })
    }

    // get all apis for each chains
    const vaultsCombiniations: ScannedVault[] = []

    for (const [genesisHash, proxiedAddresses] of Object.entries(proxiedAccountsByChain)) {
      const api = get(pjsApiSelector(genesisHash))
      await api.isReady

      if (!api.query.proxy?.proxies) continue
      const allProxies = await api.query.proxy.proxies.multi(proxiedAddresses.map(a => a.address.toSs58()))
      allProxies.forEach((proxies, i) => {
        proxies[0].forEach(proxy => {
          // only non delay is supported atm
          // TODO: support delay proxies
          if (proxy.delay.toNumber() !== 0) return

          const delegate = Address.fromPubKey(proxy.delegate.toHex())
          if (!delegate) return

          const multisig = multisigs[delegate.toSs58()]
          if (!multisig) return

          vaultsCombiniations.push({
            proxy: proxy.proxyType.toString(),
            proxiedAddress: proxiedAddresses[i]!.address,
            multisig,
            chain: proxiedAddresses[i]!.chain,
          })
        })
      })
    }
    return { multisigs, proxiedAccounts, vaultsCombiniations }
  },
})

export const unimportedVaultsState = selector({
  key: 'unimportedVaultsState',
  get: ({ get }) => {
    const res = get(vaultsOfAccount)
    const importedVaults = get(activeTeamsState)
    return (
      res?.vaultsCombiniations.filter(
        v =>
          !importedVaults?.some(
            i => v.multisig.multisigAddress.isEqual(i.delegateeAddress) && v.proxiedAddress.isEqual(i.proxiedAddress)
          )
      ) ?? []
    )
  },
})

export const acknowledgedVaultsState = atom<Record<string, boolean>>({
  key: 'acknowledgedVaults',
  default: {},
  effects_UNSTABLE: [persist],
})

export const openScannerState = atom<boolean>({
  key: 'manualOpenState',
  default: false,
})

export const importedTeamsState = atom<Team[]>({
  key: 'importedTeamsState',
  default: [],
})

export const makeScannedVaultId = (proxiedAddress: Address, multisigAddress: Address, chain: Chain) =>
  `${proxiedAddress.toSs58()}-${multisigAddress.toSs58()}-${chain.genesisHash}`

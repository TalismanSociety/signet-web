import { selectedAccountState } from '@domains/auth'
import { PalletProxyProxyDefinition } from '@polkadot/types/lookup'
import { Address, parseCallAddressArg, toMultisigAddress } from '@util/addresses'
import { gql } from 'graphql-request'
import fetchGraphQL from '../../graphql/fetch-graphql'
import { atom, selector, selectorFamily } from 'recoil'
import { Chain, supportedChains } from '@domains/chains'
import { pjsApiSelector } from '@domains/chains/pjs-api'
import persist from '@domains/persist'
import { Team, activeTeamsState } from '@domains/offchain-data'
import { MultisigCallNames } from '@util/constants'

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
      {
        address,
        callNameIn: [MultisigCallNames.ApproveAsMulti, MultisigCallNames.AsMulti, MultisigCallNames.AsMultiThreshold1],
      },
      'tx-history'
    )) as {
      data: RawData
    }
  },
})

const getAddressProxiesSelector = selectorFamily<PalletProxyProxyDefinition[], [string, string]>({
  key: 'getAddressProxies',
  get:
    ([address, chain]) =>
    async ({ get }) => {
      const api = get(pjsApiSelector(chain))
      if (!api.query.proxy?.proxies) return []
      return (await api.query.proxy.proxies(address))[0].toArray()
    },
  dangerouslyAllowMutability: true,
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
        const signer =
          Address.fromPubKey(parseCallAddressArg(tx.extrinsic.signer)) ||
          Address.fromSs58(parseCallAddressArg(tx.extrinsic.signer))
        if (!signer) throw new Error('Invalid signer')

        // check if the multisig is on a supported chain
        const chain = supportedChains.find(c => c.genesisHash === tx.extrinsic.block.chainGenesisHash)
        if (!chain) throw new Error('Chain not supported')

        // a multisig transaction should have a threshold, except for as_multi_threshold_1
        let threshold: number | undefined = tx.extrinsic.callArgs.threshold
        if (tx.extrinsic.callName !== MultisigCallNames.AsMultiThreshold1) {
          threshold = undefined
        }
        if (typeof threshold !== 'number') throw new Error('Threshold not a number')

        // get other signers so we can derive the multisig address
        const otherSignersPubkey = tx.extrinsic.callArgs.otherSignatories ?? []
        const signers = [signer]
        for (const otherSigner of otherSignersPubkey) {
          const nextSigner = Address.fromPubKey(otherSigner) || Address.fromSs58(otherSigner)
          if (!nextSigner) throw new Error('Invalid signer from otherSignatories')
          signers.push(nextSigner)
        }

        // derive the multisig address
        const multisigAddress = toMultisigAddress(signers, tx.extrinsic.callArgs.threshold)

        multisigs[multisigAddress.toSs58()] = {
          multisigAddress,
          signers,
          threshold: tx.extrinsic.callArgs.threshold,
        }

        // we only want extrinsics where the searched account is a signer of a multisig
        const isRelevant = signers.some(s => s.isEqual(selectedAccount.injected.address))
        if (!isRelevant) return null

        // approve_as_multi does not have inner call
        if (tx.extrinsic.callName === MultisigCallNames.ApproveAsMulti) return null
        const innerCall = tx.extrinsic.callArgs.call
        if (!innerCall) throw new Error('No inner call, not a multisig to proxy call')

        if (innerCall.__kind !== 'Proxy' || innerCall.value.__kind !== 'proxy') {
          // some weird extrinsic, ignore
          return null
        }

        // find the real account of the proxy call
        const proxiedAccount =
          Address.fromPubKey(parseCallAddressArg(innerCall.value.real)) || Address.fromSs58(innerCall.value.real)
        if (!proxiedAccount) throw new Error('Invalid proxied account')

        proxiedAccounts[`${proxiedAccount.toSs58()}-${chain.genesisHash}`] = {
          address: proxiedAccount,
          chain,
        }
      } catch (e) {
        console.error({ e })
        return null
      }
    })

    const proxies = await Promise.all(
      Object.keys(proxiedAccounts).map(async key => {
        const [address, genesisHash] = key.split('-') as [string, string]
        return get(getAddressProxiesSelector([address, genesisHash]))
      })
    )

    const vaultsCombiniations: ScannedVault[] = []

    Object.entries(proxiedAccounts).forEach(([key, { address, chain }], i) => {
      const proxiesOfAccount = proxies[i]
      if (!proxiesOfAccount) return
      proxiesOfAccount.forEach(proxy => {
        // only non delay is supported atm
        // TODO: support delay proxies
        if (proxy.delay.toNumber() !== 0) return

        const delegate = Address.fromPubKey(proxy.delegate.toHex())
        if (!delegate) return

        const multisig = multisigs[delegate.toSs58()]
        if (!multisig) return

        vaultsCombiniations.push({
          proxy: proxy.proxyType.toString(),
          proxiedAddress: address,
          multisig,
          chain,
        })
      })
    })

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

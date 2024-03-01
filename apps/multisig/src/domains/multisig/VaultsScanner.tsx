import { selectedAccountState } from '@domains/auth'
import { Address, toMultisigAddress } from '@util/addresses'
import { gql } from 'graphql-request'
import fetchGraphQL from '../../graphql/fetch-graphql'
import { atom, selector, selectorFamily, useRecoilState, useRecoilValue, useRecoilValueLoadable } from 'recoil'
import { Chain, supportedChains } from '@domains/chains'
import { pjsApiSelector } from '@domains/chains/pjs-api'
import { useCallback, useMemo, useState } from 'react'
import persist from '@domains/persist'
import { activeTeamsState } from '@domains/offchain-data'
import { Button } from '@components/ui/button'
import { Dialog, DialogContent } from '@components/ui/dialog'
import { ChainPill } from '@components/ChainPill'
import { AccountDetails } from '@components/AddressInput/AccountDetails'

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

type ScannedVault = {
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

const vaultsOfAccount = selector({
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
        const signer = Address.fromPubKey(JSON.parse(tx.extrinsic.signer).value)
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
        const proxiedAccount = Address.fromPubKey(innerCall.value.real.value)
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
          if (proxy.delay.toNumber() === 0) {
            const delegate = Address.fromPubKey(proxy.delegate.toHex())
            if (!delegate) return
            const multisig = multisigs[delegate.toSs58()]
            if (multisig) {
              vaultsCombiniations.push({
                proxy: proxy.proxyType.toString(),
                proxiedAddress: proxiedAddresses[i]!.address,
                multisig,
                chain: proxiedAddresses[i]!.chain,
              })
            }
          }
        })
      })
    }

    return { multisigs, proxiedAccounts, vaultsCombiniations }
  },
})

const acknowledgedVaultsState = atom<Record<string, boolean>>({
  key: 'acknowledgedVaults',
  default: {},
  effects_UNSTABLE: [persist],
})

const makeId = (proxiedAddress: Address, multisigAddress: Address, chain: Chain) =>
  `${proxiedAddress.toSs58()}-${multisigAddress.toSs58()}-${chain.genesisHash}`

export const VaultsScanner: React.FC = () => {
  const [viewMultisig, setViewMultisig] = useState<ScannedVault>()
  const res = useRecoilValueLoadable(vaultsOfAccount)
  const [acknowledgedVaults, setAcknowledgedVaults] = useRecoilState(acknowledgedVaultsState)
  const importedVaults = useRecoilValue(activeTeamsState)

  const unimportedVaults = useMemo(() => {
    if (res.state !== 'hasValue' || !importedVaults) return []
    return (
      res.contents?.vaultsCombiniations.filter(
        v =>
          !importedVaults.some(
            i => v.multisig.multisigAddress.isEqual(i.delegateeAddress) && v.proxiedAddress.isEqual(i.proxiedAddress)
          )
      ) ?? []
    )
  }, [importedVaults, res.contents?.vaultsCombiniations, res.state])

  const unacknowledgedVaults = useMemo(
    () =>
      unimportedVaults.filter(
        v => !acknowledgedVaults[makeId(v.proxiedAddress, v.multisig.multisigAddress, v.chain)]
      ) ?? [],
    [acknowledgedVaults, unimportedVaults]
  )

  const acknowledge = useCallback(() => {
    setAcknowledgedVaults(old => {
      const newAcknowledged = { ...old }
      unacknowledgedVaults.forEach(v => {
        newAcknowledged[makeId(v.proxiedAddress, v.multisig.multisigAddress, v.chain)] = true
      })
      return newAcknowledged
    })
  }, [setAcknowledgedVaults, unacknowledgedVaults])

  return (
    <Dialog
      open={unacknowledgedVaults.length > 0}
      onOpenChange={open => {
        if (!open) acknowledge()
      }}
    >
      <DialogContent>
        <div className="w-full flex flex-col gap-[12px] h-full">
          <h1 className="text-[20px] font-bold">New Vaults Detected</h1>
          <div className="w-full h-full flex flex-col gap-[12px] overflow-y-auto max-h-[340px]">
            {unimportedVaults.map(vault => (
              <button
                className="p-[16px] py-[8px] w-full rounded-[12px] bg-gray-800 gap-[8px] flex flex-col hover:border-primary border border-gray-800 hover:bg-gray-700"
                key={`${vault.multisig.multisigAddress.toSs58()}-${vault.proxiedAddress.toSs58()}`}
              >
                <div className="w-full flex items-center justify-between">
                  <div>
                    <AccountDetails address={vault.proxiedAddress} chain={vault.chain} withAddressTooltip disableCopy />
                  </div>
                  <div className="flex items-center justify-end gap-[8px] w-full">
                    <Button size="sm" variant="outline" onClick={() => setViewMultisig(vault)}>
                      View Multisig
                    </Button>
                    <Button size="sm" variant="outline">
                      Import
                    </Button>
                  </div>
                </div>
                <p className="text-[14px]">
                  Controlled by {vault.multisig.threshold} of {vault.multisig.signers.length} multisg via{' '}
                  <span className="text-offWhite font-semibold">{vault.proxy}</span> proxy.
                </p>
                <div className="[&_p]:text-[14px]">
                  <ChainPill identiconSize={20} chain={vault.chain} />
                </div>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="lg" className="self-center" onClick={acknowledge}>
            Import Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

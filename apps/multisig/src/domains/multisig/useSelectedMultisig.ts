import { Multisig, MultisigWithExtraData, ProxyDefinition } from './types'
import { atom, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { DUMMY_MULTISIG_ID, selectedMultisigIdState, selectedMultisigState } from '.'
import { useCallback, useEffect, useMemo } from 'react'
import { useProxies } from '../proxy/useProxies'
import { isEqual } from 'lodash'
import { Address } from '@util/addresses'

const proxiesState = atom<Record<string, ProxyDefinition[] | undefined>>({
  key: 'proxies',
  default: {},
})

export const useSelectedMultisig = (): [MultisigWithExtraData, (multisig: Multisig) => void] => {
  const selectedMultisig = useRecoilValue(selectedMultisigState)
  const setSelectedMultisigId = useSetRecoilState(selectedMultisigIdState)
  const cachedProxies = useRecoilValue(proxiesState)

  const proxyId = useMemo(
    () => `${selectedMultisig.proxyAddress.toSs58(selectedMultisig.chain)}-${selectedMultisig.chain.chainName}`,
    [selectedMultisig]
  )

  const {
    chain: { account },
  } = selectedMultisig

  const setSelectedMultisig = useCallback(
    (multisig: Multisig) => {
      setSelectedMultisigId(multisig.id)
    },
    [setSelectedMultisigId]
  )

  const multisigWithExtraData = useMemo((): MultisigWithExtraData => {
    if (selectedMultisig.id === DUMMY_MULTISIG_ID)
      return {
        ...selectedMultisig,
        proxies: [],
        allProxies: [],
        isCollaborator: () => false,
        isSigner: () => false,
        isEthereumAccount: account === 'secp256k1',
      }
    const proxiesOfProxiedAccount = cachedProxies[proxyId]
    const filteredProxies = proxiesOfProxiedAccount?.filter(({ delegate }) =>
      delegate.isEqual(selectedMultisig.multisigAddress)
    )

    return {
      ...selectedMultisig,
      proxies: filteredProxies,
      allProxies: proxiesOfProxiedAccount,
      isCollaborator: (address: Address) => selectedMultisig.collaborators.some(user => user.address.isEqual(address)),
      isSigner: (address: Address) => selectedMultisig.signers.some(signer => signer.isEqual(address)),
      isEthereumAccount: account === 'secp256k1',
    }
  }, [account, cachedProxies, proxyId, selectedMultisig])

  return [multisigWithExtraData, setSelectedMultisig]
}

export const ActiveMultisigWatcher: React.FC = () => {
  const selectedMultisig = useRecoilValue(selectedMultisigState)
  const { proxies } = useProxies(selectedMultisig.proxyAddress, selectedMultisig.chain)
  const [cachedProxies, setCachedProxies] = useRecoilState(proxiesState)

  const proxyId = useMemo(
    () => `${selectedMultisig.proxyAddress.toSs58(selectedMultisig.chain)}-${selectedMultisig.chain.chainName}`,
    [selectedMultisig]
  )

  useEffect(() => {
    if (selectedMultisig.id === DUMMY_MULTISIG_ID || proxies === undefined) return

    const proxiesOfProxiedAccount = cachedProxies[proxyId] || []
    if (isEqual(proxiesOfProxiedAccount, proxies)) return

    setCachedProxies(cachedProxies => ({ ...cachedProxies, [proxyId]: proxies }))
  }, [proxies, selectedMultisig.id, setCachedProxies, proxyId, cachedProxies])

  return null
}

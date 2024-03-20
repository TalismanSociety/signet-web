import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecoilValue, useRecoilValueLoadable, useSetRecoilState } from 'recoil'

import { selectedAccountState } from '@domains/auth'
import {
  Chain,
  existentialDepositSelector,
  filteredSupportedChains,
  proxyDepositTotalSelector,
  tokenByIdWithPrice,
} from '@domains/chains'
import { useCreateProxy, useTransferProxyToMultisig } from '@domains/chains/extrinsics'
import { useCreateOrganisation } from '@domains/offchain-data'
import { useAddressIsProxyDelegatee } from '@domains/chains/storage-getters'
import { Address, toMultisigAddress } from '@util/addresses'

import Confirmation from '../common/Confirmation'
import NameVault from '../common/NameVault'
import SelectChain from '../common/SelectChain'
import SignTransactions from './SignTransactions'
import { MultisigConfig } from '../MultisigConfig'
import { useAugmentedAccounts } from '../common/useAugmentedAccounts'
import { useToast } from '@components/ui/use-toast'
import { useBlockUnload } from '@hooks/useBlockUnload'
import { blockAccountSwitcher } from '@components/AccountSwitcher'
import { getErrorString } from '@util/misc'

export enum Step {
  NameVault,
  SelectFirstChain,
  MultisigConfig,
  Confirmation,
  Transactions,
}

const CreateMultisig = () => {
  let firstChain = filteredSupportedChains[0]
  if (!firstChain) throw Error('no supported chains')

  const navigate = useNavigate()
  const { toast, dismiss } = useToast()
  const [step, setStep] = useState(Step.NameVault)
  const [name, setName] = useState<string>('')
  const [chain, setChain] = useState<Chain>(firstChain)
  const [threshold, setThreshold] = useState<number>(2)

  const setBlockAccountSwitcher = useSetRecoilState(blockAccountSwitcher)
  const selectedSigner = useRecoilValue(selectedAccountState)
  const tokenWithPrice = useRecoilValueLoadable(tokenByIdWithPrice(chain.nativeToken.id))
  const existentialDepositLoadable = useRecoilValueLoadable(existentialDepositSelector(chain.squidIds.chainData))

  const proxyDepositTotalLoadable = useRecoilValueLoadable(proxyDepositTotalSelector(chain.squidIds.chainData))

  const { augmentedAccounts, setAddedAccounts } = useAugmentedAccounts()

  const [createdProxy, setCreatedProxy] = useState<Address | undefined>()
  const {
    createProxy,
    ready: createProxyIsReady,
    estimatedFee,
  } = useCreateProxy(chain, selectedSigner?.injected.address)
  const { addressIsProxyDelegatee } = useAddressIsProxyDelegatee(chain)
  const { createOrganisation, loading } = useCreateOrganisation()
  const { transferProxyToMultisig, ready: transferProxyToMultisigIsReady } = useTransferProxyToMultisig(chain)
  const [transferred, setTransferred] = useState(false)
  const [creatingProxy, setCreatingProxy] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [created, setCreated] = useState(false)

  // try to block user if they try to close page before completing the process
  useBlockUnload(
    useMemo(
      () => !created && (createdProxy !== undefined || loading || creatingProxy || transferring),
      [created, createdProxy, creatingProxy, loading, transferring]
    )
  )

  useEffect(() => {
    if (created) navigate('/overview')
  }, [created, navigate])

  // Address as a byte array.
  const multisigAddress = useMemo(
    () =>
      toMultisigAddress(
        augmentedAccounts.map(a => a.address),
        threshold
      ),
    [augmentedAccounts, threshold]
  )

  const vaultDetailsString = useMemo(() => {
    let text = ''
    if (name) text += `Name: ${name}\n`
    if (chain) text += `Chain: ${chain.squidIds.chainData}\n`
    if (multisigAddress) text += `Multisig Address: ${multisigAddress.toSs58()}\n`
    if (createdProxy) text += `Proxy Address: ${createdProxy.toSs58()}\n`
    if (augmentedAccounts.length) text += `Members: ${augmentedAccounts.map(acc => acc.address.toSs58()).join(', ')}\n`
    if (threshold) text += `Threshold: ${threshold}\n`
    return text
  }, [augmentedAccounts, chain, createdProxy, multisigAddress, name, threshold])

  const handleCreateProxy = useCallback(() => {
    setCreatingProxy(true)
    setBlockAccountSwitcher(true)
    return new Promise<void>(resolve => {
      createProxy({
        onSuccess: proxyAddress => {
          setCreatedProxy(proxyAddress)
          setCreatingProxy(false)
          dismiss()
          toast({
            title: 'Successfully created proxy.',
            description: 'Lets transfer it to your multisig now.',
          })
          resolve()
        },
        onFailure: e => {
          setBlockAccountSwitcher(false)
          toast({
            title: 'Failed to create pure proxy.',
            description: e,
          })
          resolve()
          setCreatingProxy(false)
        },
      })
    })
  }, [createProxy, dismiss, setBlockAccountSwitcher, toast])

  const handleCreateTeam = useCallback(async () => {
    if (!createdProxy) return // cannot happen UI wise
    try {
      const { ok, error } = await createOrganisation({
        name,
        chain: chain.squidIds.chainData,
        multisig_config: { signers: augmentedAccounts.map(a => a.address.toSs58()), threshold },
        proxied_address: createdProxy.toSs58(),
      })

      if (!ok || error) throw new Error(error || 'Please try again or submit a bug report.')

      // vault created! `createTeam` will handle adding the team to the cache
      // go to overview to check the newly created vault
      toast({ title: 'Vault Created!' })
      setCreated(true)
    } catch (e) {
      toast({
        title: 'Failed to save vault',
        description: getErrorString(e),
      })
    } finally {
      setTransferred(true)
      setTransferring(false)
    }
  }, [augmentedAccounts, chain.squidIds.chainData, createOrganisation, createdProxy, name, threshold, toast])

  const handleTransferProxy = useCallback(() => {
    setTransferring(true)
    return new Promise<void>(resolve => {
      if (!createdProxy) {
        // shouldn't ever reach this code block because UI should block it
        resolve()
        setTransferring(false)
        return toast({
          title: 'Could not transfer proxy.',
          description: 'Please try again, make sure you have enough balance for gas and existential deposit.',
        })
      }
      transferProxyToMultisig(
        selectedSigner?.injected.address,
        createdProxy,
        multisigAddress,
        existentialDepositLoadable.contents,
        async () => {
          const { isProxyDelegatee } = await addressIsProxyDelegatee(createdProxy, multisigAddress)

          if (!isProxyDelegatee) {
            const msg =
              'Please try again or submit a bug report with your signer address and any relevant transaction hashes.'
            return toast({
              title: 'Failed to transfer proxy.',
              description: msg,
            })
          }
          handleCreateTeam()
        },
        err => {
          resolve()
          setTransferring(false)
          toast({
            title: 'Failed to transfer proxy.',
            description: err,
          })
        }
      )
    })
  }, [
    addressIsProxyDelegatee,
    createdProxy,
    existentialDepositLoadable.contents,
    handleCreateTeam,
    multisigAddress,
    selectedSigner?.injected.address,
    toast,
    transferProxyToMultisig,
  ])

  // unlock account switcher when leaving this page
  useEffect(() => () => setBlockAccountSwitcher(false), [setBlockAccountSwitcher])

  const onNextChain = useCallback(() => {
    setStep(Step.MultisigConfig)
  }, [])

  const onBackChain = useCallback(() => {
    setStep(Step.NameVault)
  }, [])

  return (
    <>
      {step === Step.NameVault ? (
        <NameVault
          header="Create Vault"
          onBack={() => navigate('/add-vault')}
          onNext={() => setStep(Step.SelectFirstChain)}
          setName={setName}
          name={name}
        />
      ) : step === Step.SelectFirstChain ? (
        <SelectChain
          header="Create Vault"
          onBack={onBackChain}
          onNext={onNextChain}
          setChain={setChain}
          chain={chain}
          chains={filteredSupportedChains}
        />
      ) : step === Step.MultisigConfig ? (
        <MultisigConfig
          header="Create Vault"
          chain={chain}
          threshold={threshold}
          onThresholdChange={setThreshold}
          onBack={() => setStep(Step.SelectFirstChain)}
          onNext={() => setStep(Step.Confirmation)}
          members={augmentedAccounts}
          onMembersChange={setAddedAccounts}
        />
      ) : step === Step.Confirmation ? (
        <Confirmation
          header="Create Vault"
          onBack={() => setStep(Step.MultisigConfig)}
          onCreateVault={() => setStep(Step.Transactions)}
          selectedAccounts={augmentedAccounts}
          threshold={threshold}
          name={name}
          chain={chain}
          reserveAmount={proxyDepositTotalLoadable}
          estimatedFee={estimatedFee}
          tokenWithPrice={tokenWithPrice}
          extrinsicsReady={transferProxyToMultisigIsReady && createProxyIsReady}
          existentialDeposit={existentialDepositLoadable}
        />
      ) : step === Step.Transactions ? (
        <SignTransactions
          chain={chain}
          created={created}
          creating={creatingProxy}
          creatingTeam={loading}
          createdProxy={createdProxy}
          onBack={() => setStep(Step.Confirmation)}
          onCreateProxy={handleCreateProxy}
          onSaveVault={handleCreateTeam}
          onTransferProxy={handleTransferProxy}
          transferred={transferred}
          transferring={transferring}
          vaultDetailsString={vaultDetailsString}
        />
      ) : null}
    </>
  )
}

export default CreateMultisig

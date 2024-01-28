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
import { useCreateTeamOnHasura } from '@domains/offchain-data'
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
  const { createTeam, creatingTeam } = useCreateTeamOnHasura()
  const { transferProxyToMultisig, ready: transferProxyToMultisigIsReady } = useTransferProxyToMultisig(chain)
  const [transferred, setTransferred] = useState(false)
  const [creatingProxy, setCreatingProxy] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [created, setCreated] = useState(false)

  // try to block user if they try to close page before completing the process
  useBlockUnload(
    useMemo(
      () => !created && (createdProxy !== undefined || creatingTeam || creatingProxy || transferring),
      [created, createdProxy, creatingProxy, creatingTeam, transferring]
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
    if (!createdProxy) return // cannot happen
    const { team, error } = await createTeam({
      name,
      chain: chain.squidIds.chainData,
      multisigConfig: { signers: augmentedAccounts.map(a => a.address.toSs58()), threshold },
      proxiedAddress: createdProxy.toSs58(),
    })

    // TODO: Allow manually trigger save team in case failure (e.g. network failure)
    if (!team || error) throw Error()
    // vault created! `createTeam` will handle adding the team to the cache
    // go to overview to check the newly created vault
    toast({
      title: 'Vault Created!',
    })
    setCreated(true)
  }, [augmentedAccounts, chain.squidIds.chainData, createTeam, createdProxy, name, threshold, toast])

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
          setTransferred(true)
          setTransferring(false)
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

  return (
    <>
      {step === Step.NameVault ? (
        <NameVault
          onBack={() => navigate('/add-vault')}
          onNext={() => setStep(Step.SelectFirstChain)}
          setName={setName}
          name={name}
        />
      ) : step === Step.SelectFirstChain ? (
        <SelectChain
          onBack={() => setStep(Step.NameVault)}
          onNext={() => setStep(Step.MultisigConfig)}
          setChain={setChain}
          chain={chain}
          chains={filteredSupportedChains}
        />
      ) : step === Step.MultisigConfig ? (
        <MultisigConfig
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
          creating={creatingProxy}
          createdProxy={createdProxy}
          onBack={() => setStep(Step.Confirmation)}
          onCreateProxy={handleCreateProxy}
          onTransferProxy={handleTransferProxy}
          transferred={transferred}
          transferring={transferring}
        />
      ) : null}
    </>
  )
}

export default CreateMultisig

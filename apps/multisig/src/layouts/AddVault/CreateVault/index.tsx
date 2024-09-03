import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecoilValue, useRecoilValueLoadable, useSetRecoilState } from 'recoil'

import { selectedAccountState } from '@domains/auth'
import {
  Chain,
  filteredSupportedChains,
  initialVaultFundSelector,
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
import { blockAccountSwitcher } from '@components/AccountMenu/AccountsList'
import { getErrorString } from '@util/misc'
import { useSearchParams } from 'react-router-dom'

export enum Step {
  NameVault,
  SelectFirstChain,
  MultisigConfig,
  Confirmation,
  Transactions,
}

export type Param = 'name' | 'step' | 'chainId' | 'threshold' | 'members'

const CreateMultisig = () => {
  let firstChain = filteredSupportedChains[0]
  if (!firstChain) throw Error('no supported chains')

  const [searchParams, setSearchParams] = useSearchParams()
  const selectedChainParam = filteredSupportedChains.find(c => c.id === searchParams.get('chainId'))
  const membersParam = searchParams
    .get('members')
    ?.split(',')
    .map(Address.fromSs58)
    .filter(addr => !!addr) as Address[]

  const navigate = useNavigate()
  const { toast, dismiss } = useToast()
  const [step, setStep] = useState<Step>(Number(searchParams.get('step')) || Step.NameVault)
  const [name, setName] = useState<string>(searchParams.get('name') || '')
  const [chain, setChain] = useState<Chain>(selectedChainParam || firstChain)
  const [threshold, setThreshold] = useState<number>(Number(searchParams.get('threshold')) || 2)

  const setBlockAccountSwitcher = useSetRecoilState(blockAccountSwitcher)
  const selectedSigner = useRecoilValue(selectedAccountState)
  const tokenWithPrice = useRecoilValueLoadable(tokenByIdWithPrice(chain.nativeToken.id))
  const initialVaultFundsLoadable = useRecoilValueLoadable(initialVaultFundSelector(chain.id))

  const proxyDepositTotalLoadable = useRecoilValueLoadable(proxyDepositTotalSelector(chain.id))

  const isChainAccountEth = chain?.account === 'secp256k1'

  const { augmentedAccounts, setAddedAccounts } = useAugmentedAccounts({
    chain,
    isChainAccountEth,
    initialAddedAccounts: membersParam,
  })

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

  const updateSearchParm = useCallback(
    ({ param, value }: { param: Param; value: string }) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set(param, value)
      setSearchParams(newParams)
    },
    [searchParams, setSearchParams]
  )

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
    if (chain) text += `Chain: ${chain.id}\n`
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
        chain: chain.id,
        multisig_config: { signers: augmentedAccounts.map(a => a.address.toSs58()), threshold },
        proxied_address: createdProxy.toSs58(),
      })

      if (!ok || error) throw new Error(error || 'Please try again or submit a bug report.')

      // multisig created! `createTeam` will handle adding the team to the cache
      // go to overview to check the newly created multisig
      toast({ title: 'Multisig Created!' })
      setCreated(true)
    } catch (e) {
      toast({
        title: 'Failed to save multisig',
        description: getErrorString(e),
      })
    } finally {
      setTransferred(true)
      setTransferring(false)
    }
  }, [augmentedAccounts, chain.id, createOrganisation, createdProxy, name, threshold, toast])

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
        initialVaultFundsLoadable.contents,
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
          setTransferring(false)
          toast({
            title: 'Failed to transfer proxy.',
            description: err,
          })
          resolve()
        }
      )
    })
  }, [
    addressIsProxyDelegatee,
    createdProxy,
    initialVaultFundsLoadable.contents,
    handleCreateTeam,
    multisigAddress,
    selectedSigner?.injected.address,
    toast,
    transferProxyToMultisig,
  ])

  // unlock account switcher when leaving this page
  useEffect(() => () => setBlockAccountSwitcher(false), [setBlockAccountSwitcher])

  const onNextChain = useCallback(() => {
    setStep(prev => prev + 1)
    updateSearchParm({ param: 'step', value: (step + 1).toString() })
  }, [step, updateSearchParm])

  const onBackChain = useCallback(() => {
    setStep(prev => prev - 1)
    updateSearchParm({ param: 'step', value: (step - 1).toString() })
  }, [step, updateSearchParm])

  const renderStep = () => {
    const stepMap: Record<Step, React.ReactElement> = {
      [Step.NameVault]: (
        <NameVault
          header="Create Multisig"
          onBack={() => {
            onBackChain()
            navigate('/add-multisig')
          }}
          onNext={() => onNextChain()}
          setName={newName => {
            setName(newName)
            updateSearchParm({ param: 'name', value: newName })
          }}
          name={name}
        />
      ),
      [Step.SelectFirstChain]: (
        <SelectChain
          header="Create Multisig"
          isChainAccountEth={isChainAccountEth}
          onBack={onBackChain}
          onNext={onNextChain}
          setAddedAccounts={setAddedAccounts}
          updateSearchParm={updateSearchParm}
          setChain={chain => {
            setChain(chain)
            updateSearchParm({ param: 'chainId', value: chain.id })
          }}
          chain={chain}
          chains={filteredSupportedChains}
        />
      ),
      [Step.MultisigConfig]: (
        <MultisigConfig
          header="Create Multisig"
          chain={chain}
          threshold={threshold}
          onThresholdChange={threshold => {
            setThreshold(threshold)
            updateSearchParm({ param: 'threshold', value: threshold.toString() })
          }}
          onBack={onBackChain}
          onNext={onNextChain}
          members={augmentedAccounts}
          setAddedAccounts={updater => {
            setAddedAccounts(prev => {
              const updated = typeof updater === 'function' ? updater(prev) : updater
              updateSearchParm({ param: 'members', value: updated.map(a => a.toSs58()).join(',') })
              return updated
            })
          }}
        />
      ),
      [Step.Confirmation]: (
        <Confirmation
          header="Create Multisig"
          onBack={onBackChain}
          onCreateVault={onNextChain}
          selectedAccounts={augmentedAccounts}
          threshold={threshold}
          name={name}
          chain={chain}
          reserveAmount={proxyDepositTotalLoadable}
          estimatedFee={estimatedFee}
          tokenWithPrice={tokenWithPrice}
          extrinsicsReady={transferProxyToMultisigIsReady && createProxyIsReady}
          existentialDeposit={initialVaultFundsLoadable}
        />
      ),
      [Step.Transactions]: (
        <SignTransactions
          chain={chain}
          created={created}
          creating={creatingProxy}
          creatingTeam={loading}
          createdProxy={createdProxy}
          onBack={onBackChain}
          onCreateProxy={handleCreateProxy}
          onSaveVault={handleCreateTeam}
          onTransferProxy={handleTransferProxy}
          transferred={transferred}
          transferring={transferring}
          vaultDetailsString={vaultDetailsString}
        />
      ),
    }
    return stepMap[step] ?? null
  }

  return renderStep()
}

export default CreateMultisig

import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '../Layout'
import { useEffect, useMemo, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { Multisig, multisigsState, useSelectedMultisig } from '@domains/multisig'
import { Address } from '@util/addresses'
import { Chain, filteredSupportedChains } from '@domains/chains'
import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { Button } from '@components/ui/button'
import { SignSummary } from './SignSummary'
import { TextInput } from '@talismn/ui'
import { authTokenBookState, selectedAddressState } from '@domains/auth'
import { XCircle } from '@talismn/icons'
import { TransactionDetailsDialog } from './TransactionDetailsDialog'

const Wrapper: React.FC<React.PropsWithChildren & { source?: string }> = ({ children, source }) => (
  <Layout hideSideBar requiresMultisig>
    <div className="h-fit grid bg-gray-900 gap-[48px] rounded-[24px] justify-center mx-auto my-[50px] max-w-[863px] w-full py-[80px] px-[16px]">
      <div className="w-full text-center grid gap-[8px]">
        <h1 className="text-[32px] leading-[32px] h-max">Sign Transaction</h1>
        <p className="w-full">
          A new transaction was requested from{' '}
          {source ? <span className="text-offWhite">{source}</span> : 'an external source'}.
        </p>
      </div>
      {children}
    </div>
  </Layout>
)

export const Sign: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const multisigs = useRecoilValue(multisigsState)
  const [selectedMultisig, setSelectedMultisig] = useSelectedMultisig()
  const [authTokenBook] = useRecoilState(authTokenBookState)
  const [selectedAddress, setSelectedAddress] = useRecoilState(selectedAddressState)
  const [reviewing, setReviewing] = useState(false)
  const [skipAutoSelect, setSkipAutoSelect] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const { id, callDataHex, dappUrl, proxiedAccount, genesisHash } = useMemo(() => {
    const proxiedAccount = Address.fromSs58(searchParams.get('account') ?? '')

    let dappUrl
    try {
      const parsedDappUrl = new URL(searchParams.get('dapp') ?? '')
      if (parsedDappUrl) dappUrl = parsedDappUrl
    } catch (e) {}

    const genesisHash = searchParams.get('genesisHash')
    const calldata = searchParams.get('calldata')
    return {
      id: searchParams.get('id'),
      callDataHex: calldata?.startsWith('0x') ? calldata : undefined,
      dappUrl,
      proxiedAccount,
      genesisHash,
      multisig: proxiedAccount
        ? multisigs.find(
            ({ proxyAddress, chain }) =>
              chain.genesisHash.toLowerCase() === genesisHash?.toLowerCase() &&
              proxiedAccount &&
              proxyAddress.isEqual(proxiedAccount)
          )
        : undefined,
    }
  }, [multisigs, searchParams])

  const [description, setDescription] = useState(`Transaction from ${dappUrl?.origin}`)

  const targetVaults = useMemo(() => {
    if (!proxiedAccount || !genesisHash) return undefined
    const counted = new Map<string, boolean>()
    const uniqueMultisigs: Multisig[] = []
    for (const multisig of multisigs) {
      if (!counted.has(multisig.proxyAddress.toSs58())) {
        uniqueMultisigs.push(multisig)
        counted.set(multisig.proxyAddress.toSs58(), true)
      }
    }
    return uniqueMultisigs.filter(
      ({ proxyAddress, chain }) =>
        chain.genesisHash.toLowerCase() === genesisHash.toLowerCase() &&
        proxiedAccount &&
        proxyAddress.isEqual(proxiedAccount)
    )
  }, [genesisHash, multisigs, proxiedAccount])

  // auto select a vault that can sign the tx across all signed in accounts
  useEffect(() => {
    if (!targetVaults || !proxiedAccount || !selectedAddress || skipAutoSelect) return

    // dont need to auto select if the current vault is already the right one
    if (selectedMultisig.proxyAddress.isEqual(proxiedAccount)) return setSkipAutoSelect(true)

    const curSignerAddress = Address.fromSs58(selectedAddress)
    if (!curSignerAddress) return

    // find a vault where the current signed in user is a signer and use that vault
    for (const vault of targetVaults) {
      if (vault.signers.find(signer => signer.isEqual(curSignerAddress))) {
        setSkipAutoSelect(true)
        return setSelectedMultisig(vault)
      }
    }

    // find a vault where one of the signers is already signed in, then switch to that signer and vault
    for (const vault of targetVaults) {
      const newSelectedAddress = vault.signers.find(signer => authTokenBook[signer.toSs58()])
      if (newSelectedAddress) {
        setSkipAutoSelect(true)
        setSelectedAddress(newSelectedAddress.toSs58())
        return setSelectedMultisig(vault)
      }
    }
  }, [
    authTokenBook,
    proxiedAccount,
    selectedAddress,
    selectedMultisig.proxyAddress,
    setSelectedAddress,
    setSelectedMultisig,
    skipAutoSelect,
    targetVaults,
  ])

  if (!id || !callDataHex || !dappUrl || !proxiedAccount || !genesisHash)
    return (
      <Wrapper>
        <p className="text-center">Invalid request, please try again.</p>
      </Wrapper>
    )

  const correctVault = selectedMultisig.proxyAddress.isEqual(proxiedAccount)

  return (
    <Wrapper source={dappUrl.origin}>
      <div className="grid w-full gap-[24px]">
        <div className="flex flex-col sm:flex-row items-center w-full gap-[24px]">
          <div className="w-full">
            <p className="text-[14px]">Source</p>
            <p className="text-offWhite">{dappUrl.origin}</p>
          </div>
          <div className="w-full">
            <p className="text-[14px]">Vault</p>
            <AccountDetails
              address={proxiedAccount}
              name={targetVaults?.map(({ name }) => name).join(', ')}
              chain={targetVaults?.[0]?.chain ?? (filteredSupportedChains[0] as Chain)}
              nameOrAddressOnly
              withAddressTooltip
              disableCopy
            />
          </div>
        </div>
        <TextInput
          leadingLabel="Transaction Description"
          css={{ label: { fontSize: 14 } }}
          placeholder={`e.g. "Buy DOT"`}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <TransactionDetailsDialog
          callDataHex={callDataHex as `0x${string}`}
          onClose={() => setShowDetails(false)}
          open={showDetails}
          genesisHash={genesisHash}
        >
          <Button className="mx-auto" size="lg" variant="secondary" onClick={() => setShowDetails(true)}>
            View Details
          </Button>
        </TransactionDetailsDialog>
        <div className="w-full flex flex-col sm:flex-row gap-[16px]">
          <Button className="w-full" variant="outline" onClick={window.close}>
            Cancel
          </Button>
          <Button
            className="w-full"
            onClick={() => setReviewing(true)}
            loading={reviewing}
            disabled={reviewing || !correctVault}
          >
            Review
          </Button>
        </div>
        {!correctVault && (
          <div className="p-[16px] rounded-[8px] bg-gray-800 w-full mt-[4px] flex items-center gap-[8px]">
            <XCircle size={20} className="text-red-600 min-w-[20px]" />
            <p>Please select a vault that is able to sign the request.</p>
          </div>
        )}
      </div>
      <SignSummary
        calldata={callDataHex as `0x${string}`}
        description={description || `Transaction from ${dappUrl.origin}`}
        selectedMultisig={selectedMultisig}
        open={reviewing}
        onCancel={() => setReviewing(false)}
        onApproved={() => {
          setReviewing(false)
          navigate('/overview')
        }}
      />
    </Wrapper>
  )
}

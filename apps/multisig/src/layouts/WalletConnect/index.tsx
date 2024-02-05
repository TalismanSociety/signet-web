import WalletConnectLogo from '@components/WalletConnectLogo'
import { PairingTypes } from '@walletconnect/types'
import { Layout } from '../Layout'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Input } from '@components/ui/input'
import { Button } from '@components/ui/button'
import { useWalletConnectSessions } from '@domains/wallet-connect'
import { StatusMessage } from '@components/StatusMessage'
import { useNow } from '@hooks/useNow'
import { useToast } from '@components/ui/use-toast'
import { useSelectedMultisig } from '@domains/multisig'
import { Web3WalletTypes } from '@walletconnect/web3wallet'
import { getSdkError } from '@walletconnect/utils'
import Modal from '@components/Modal'
import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { Chain, supportedChains } from '@domains/chains'
import { XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getErrorString } from '@util/misc'

export const WalletConnectPage: React.FC = () => {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [pairResult, setPairResult] = useState<PairingTypes.Struct | null>(null)
  const now = useNow()
  const { toast } = useToast()
  const [selectedMultisig] = useSelectedMultisig()
  const [sessionProposal, setSessionProposal] = useState<Web3WalletTypes.SessionProposal | null>(null)
  const { sessions, refresh, web3Wallet } = useWalletConnectSessions(selectedMultisig.proxyAddress)

  const handleConnect = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!web3Wallet) return
    setConnecting(true)
    try {
      const result = await web3Wallet.core.pairing.pair({ uri: input })
      setPairResult(result)
    } catch (e) {
      console.error('Failed to connect via WalletConnect', e)
      toast({
        title: "Couldn't connect to WalletConnect",
        description: getErrorString(e) ?? 'Please try again.',
      })
    } finally {
      setConnecting(false)
    }
  }

  const gettingConnectionDetails = useMemo(() => !!pairResult && !sessionProposal, [pairResult, sessionProposal])

  const onSessionApproval = useCallback((proposal: Web3WalletTypes.SessionProposal) => {
    setSessionProposal(proposal)
  }, [])

  useEffect(() => {
    if (!pairResult) return
    if (pairResult.expiry <= Math.floor(now.getTime() / 1000)) {
      setPairResult(null)
      toast({
        title: 'Pairing Expired',
        description: 'The pairing request with Wallet Connect has expired. Please try again.',
      })
    }
  }, [now, pairResult, toast])

  useEffect(() => {
    if (!web3Wallet) return
    web3Wallet.on('session_proposal', onSessionApproval)
    return () => {
      web3Wallet.off('session_proposal', onSessionApproval)
    }
  }, [onSessionApproval, web3Wallet])

  const targetNetworks = useMemo(() => {
    if (!sessionProposal) return []

    const targetNamespace = sessionProposal.params.requiredNamespaces.polkadot
    if (!targetNamespace) return []

    if (!targetNamespace.chains) return []
    return targetNamespace.chains
      .map(chainString => {
        const genesisHashPart = chainString.split(':')[1]
        if (!genesisHashPart) return []

        const chain = supportedChains.find(chain => chain.genesisHash.startsWith(`0x${genesisHashPart}`))
        if (!chain) return null
        return chain
      })
      .filter(chain => chain !== null) as Chain[]
  }, [sessionProposal])

  const handleApproveConnection = useCallback(async () => {
    if (!sessionProposal || !web3Wallet) return

    const genesisHash = selectedMultisig.chain.genesisHash
    const targetChainNamespace = sessionProposal.params.requiredNamespaces.polkadot?.chains?.[0]
    const formattedAddress = `${
      targetChainNamespace ?? `polkadot:${genesisHash.substring(2, 34)}`
    }:${selectedMultisig.proxyAddress.toSs58(selectedMultisig.chain)}`

    try {
      setApproving(true)
      const res = await web3Wallet.approveSession({
        id: sessionProposal.id,
        namespaces: {
          polkadot: {
            accounts: [formattedAddress],
            events: sessionProposal.params.requiredNamespaces.polkadot?.events ?? [],
            methods: sessionProposal.params.requiredNamespaces.polkadot?.methods ?? [],
          },
        },
      })

      if (!res) return
      toast({
        title: 'Session Approved',
        description: `You may use ${selectedMultisig.name} in ${sessionProposal.params.proposer.metadata.name} now.`,
        duration: 2000,
      })

      refresh()
      setInput('')
      setPairResult(null)
      setSessionProposal(null)
      navigate('/wallet-connect/sessions')
    } catch (e) {
      console.error('Failed to approve wallet connect session.')
      toast({
        title: 'Failed to approve wallet connect session.',
        description: 'Please try again. Make sure the request is still valid.',
      })
    } finally {
      setApproving(false)
    }
  }, [
    navigate,
    refresh,
    selectedMultisig.chain,
    selectedMultisig.name,
    selectedMultisig.proxyAddress,
    sessionProposal,
    toast,
    web3Wallet,
  ])

  const handleReject = useCallback(() => {
    setSessionProposal(null)
    setPairResult(null)

    try {
      if (!sessionProposal || !web3Wallet) return
      web3Wallet.rejectSession({ id: sessionProposal.id, reason: getSdkError('USER_REJECTED') })
    } catch (e) {
      console.error('Failed to reject wallet connect request.')
    }
  }, [sessionProposal, web3Wallet])

  const isNetworkSupported = useMemo(() => {
    return targetNetworks.some(network => network.genesisHash === selectedMultisig.chain.genesisHash)
  }, [selectedMultisig.chain.genesisHash, targetNetworks])

  return (
    <Layout selected="Wallet Connect" requiresMultisig>
      <div className="flex flex-1 py-[32px] px-[8%] flex-col gap-[16px] w-1">
        <div className="grid gap-[12px] w-full">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center justify-start gap-[12px]">
              <WalletConnectLogo className="text-[#3396ff] w-[32px] h-[32px] min-w-[32px]" />
              <h2 className="text-offWhite sm:text-[24px] mt-[4px] font-bold text-[20px]">Wallet Connect</h2>
            </div>
            {sessions.length > 0 && (
              <Button
                className="flex items-center gap-[8px] border rounded-full border-gray-400 px-[8px] hover:border-offWhite cursor-pointer"
                asLink
                to="/wallet-connect/sessions"
                size="lg"
                variant="outline"
              >
                <div className="w-[12px] h-[12px] bg-green-500/50 rounded-full flex items-center justify-center">
                  <div className="w-[8px] h-[8px] bg-green-500 rounded-full" />
                </div>
                <span className="text-[14px] mt-[3px] text-inherit">
                  {sessions.length} session{sessions.length > 1 ? 's' : ''}
                </span>
              </Button>
            )}
          </div>
          <p>Connect to Dapps supporting WalletConnect and manage signing within Signet.</p>
        </div>

        <form className="grid gap-[16px] max-w-[450px]" onSubmit={handleConnect}>
          <Input
            onChange={e => setInput(e.target.value)}
            value={input}
            label={<span className="font-bold text-offWhite text-[16px]">WalletConnect Key</span>}
            placeholder="wc:..."
          />
          {web3Wallet ? (
            <Button
              disabled={!input || connecting || gettingConnectionDetails}
              loading={connecting || gettingConnectionDetails}
              className="w-max"
            >
              Connect
            </Button>
          ) : (
            <StatusMessage type="loading" message="Initiating Wallet Connect" />
          )}
        </form>

        <Modal isOpen={!!sessionProposal} className="max-w-[320px]">
          {!!sessionProposal && (
            <div className="flex flex-col gap-[16px] w-full">
              <div>
                <p className="text-[18px] mb-[4px]">
                  <b className="text-offWhite">{sessionProposal.params.proposer.metadata.name}</b> wants to connect to{' '}
                </p>
                <AccountDetails
                  address={selectedMultisig.proxyAddress}
                  name={selectedMultisig.name}
                  chain={selectedMultisig.chain}
                />
              </div>

              <div className="w-full p-[16px] rounded-[12px] border border-gray-500">
                <p className="text-[14px] mt-[2px]">
                  Website: <span className="text-offWhite">{sessionProposal.params.proposer.metadata.url}</span>
                </p>
                {sessionProposal.params.requiredNamespaces !== undefined && (
                  <p className="text-[14px]">
                    Method:{' '}
                    <span className="text-offWhite">
                      {Object.values(sessionProposal.params.requiredNamespaces)
                        .map(value => value.methods.join(', '))
                        .join(', ')}
                    </span>
                  </p>
                )}
              </div>

              {!isNetworkSupported && (
                <div className="p-[16px] rounded-[12px] bg-gray-800">
                  <div className="flex gap-[8px] items-center">
                    <XCircle className="text-red-500" />
                    <p className="text-offWhite ">Network not supported!</p>
                  </div>
                  <p className="ml-[32px] text-[14px]">
                    {selectedMultisig.name} is on {selectedMultisig.chain.chainName} but{' '}
                    {sessionProposal.params.proposer.metadata.name} requires{' '}
                    {targetNetworks.length === 0
                      ? 'an unsupported network'
                      : targetNetworks.map(({ chainName }) => chainName).join(', ')}
                    .
                  </p>
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row items-center gap-[16px] w-full">
                <Button variant="outline" onClick={handleReject} className="w-full">
                  Cancel
                </Button>
                <Button className="w-full" onClick={handleApproveConnection} loading={approving} disabled={approving}>
                  Connect{isNetworkSupported ? '' : ' Anyway'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  )
}

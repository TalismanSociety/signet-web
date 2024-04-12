import { useWalletConnectSessions } from './WalletConnectProvider'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Web3WalletTypes } from '@walletconnect/web3wallet'
import { useSelectedMultisig } from '@domains/multisig'
import Modal from '@components/Modal'
import { Address } from '@util/addresses'
import { TransactionSidesheet } from '@components/TransactionSidesheet'
import { getSdkError } from '@walletconnect/utils'
import { Button } from '@components/ui/button'
import { CONFIG } from '@lib/config'

enum SessionRequestError {
  UNKNOWN_ADDRESS = 'UNKNOWN_ADDRESS',
  UNSUPPORTED_METHOD = 'UNSUPPORTED_METHOD',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
}

export const WalletConnectRequest: React.FC = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const [sessionRequest, setSessionRequest] = useState(null as Web3WalletTypes.SessionRequest | null)
  const { sessions, web3Wallet } = useWalletConnectSessions(selectedMultisig.proxyAddress)

  // subscribe to any transaction request
  useEffect(() => {
    if (!web3Wallet) return
    const onNewRequest = (arg: Web3WalletTypes.SessionRequest) => setSessionRequest(arg)
    web3Wallet.on('session_request', onNewRequest)
    return () => {
      web3Wallet.off('session_request', onNewRequest)
    }
  }, [web3Wallet])

  const handleCancel = useCallback(async () => {
    if (!sessionRequest || !web3Wallet) return
    try {
      web3Wallet
        .respondSessionRequest({
          topic: sessionRequest.topic,
          response: {
            id: sessionRequest.id,
            error: getSdkError('USER_REJECTED'),
            jsonrpc: '2.0',
            result: null,
          },
        })
        .catch(console.error)
    } catch (e) {
      console.error('Failed to reject session request', e)
    } finally {
      // clear the UI
      setSessionRequest(null)
    }
  }, [sessionRequest, web3Wallet])

  const { error, method, session } = useMemo(() => {
    if (!sessionRequest) return { error: null }

    const {
      params: { request },
    } = sessionRequest

    // make sure the session is still connected
    const session = sessions.find(({ topic }) => topic === sessionRequest.topic)
    if (!session) return { error: SessionRequestError.SESSION_NOT_FOUND }

    // dont suport signing raw message
    if (request.method !== 'polkadot_signTransaction') return { session, error: SessionRequestError.UNSUPPORTED_METHOD }

    // malformed request
    if (
      !request.params ||
      !request.params.address ||
      !request.params.transactionPayload ||
      !request.params.transactionPayload.method
    )
      return { session, error: SessionRequestError.UNSUPPORTED_METHOD }

    // try to convert address to something we recognize
    let requestAddress: Address | false
    try {
      requestAddress = Address.fromSs58(request.params.address)
    } catch (e) {
      return { session, error: SessionRequestError.UNKNOWN_ADDRESS }
    }
    if (!requestAddress || !requestAddress.isEqual(selectedMultisig.proxyAddress))
      return { session, error: SessionRequestError.UNKNOWN_ADDRESS }

    // cross chain dapps may send requests to the wrong chain
    const isChainSupported = request.params.transactionPayload?.genesisHash === selectedMultisig.chain.genesisHash
    if (!isChainSupported) return { session, error: SessionRequestError.UNSUPPORTED_METHOD }

    return { method: request.params.transactionPayload.method, session, error: null }
  }, [selectedMultisig.chain.genesisHash, selectedMultisig.proxyAddress, sessionRequest, sessions])

  if (!sessionRequest) return null

  if (error === SessionRequestError.SESSION_NOT_FOUND || error === SessionRequestError.UNKNOWN_ADDRESS) {
    return (
      <Modal isOpen contentLabel="Session Not Found">
        <h1 className="font-bold text-[20px]">WalletConnect Session Not Found</h1>
        <p className="mt-[8px] max-w-[520px]">
          An unknown WalletConnect request was received. Please make sure you've selected the multisig in{' '}
          {CONFIG.APP_NAME} that you are using to create a transaction in the dapp.
        </p>
        <Button variant="outline" className="w-full mt-[16px]" onClick={handleCancel}>
          Close
        </Button>
      </Modal>
    )
  }
  if (error === SessionRequestError.UNSUPPORTED_METHOD || !method) {
    return (
      <Modal isOpen contentLabel="Unsupported Method from Wallet Connect">
        <h1 className="font-bold text-[20px]">WalletConnect Session Not Found</h1>
        <p className="mt-[8px] max-w-[520px]">
          An unsupported transaction was requested from {session?.peer.metadata.name ?? 'a dapp'} via WalletConnect.
        </p>
        <Button variant="outline" className="w-full mt-[16px]" onClick={handleCancel}>
          Close
        </Button>
      </Modal>
    )
  }

  return (
    <TransactionSidesheet
      calldata={method as `0x${string}`}
      description={`${session?.peer.metadata.name} via WalletConnect`}
      open
      // we just want to inform the dapp that something has happened, no need for the actual action
      onClose={handleCancel}
      onSaved={handleCancel}
      onApproved={handleCancel}
    />
  )
}

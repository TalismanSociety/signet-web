import { Button } from '@components/ui/button'
import { useWalletConnectSessions } from '@domains/wallet-connect'
import { useCallback, useState } from 'react'

import { ExternalLink, Unlink } from 'lucide-react'
import { Tooltip } from '@components/ui/tooltip'
import { getSdkError } from '@walletconnect/utils'
import { StatusMessage } from '@components/StatusMessage'
import { SessionTypes } from '@walletconnect/types'
import { CircularProgressIndicator } from '@talismn/ui'
import { useSelectedMultisig } from '@domains/multisig'

const Row: React.FC<{ session: SessionTypes.Struct }> = ({
  session: {
    peer: { metadata },
    topic,
  },
}) => {
  const [disconnecting, setDisconnecting] = useState(false)
  const { refresh, web3Wallet } = useWalletConnectSessions()

  const disconnectSession = useCallback(async () => {
    if (!web3Wallet) return
    setDisconnecting(true)
    try {
      await web3Wallet.disconnectSession({ topic, reason: getSdkError('USER_DISCONNECTED') })
      refresh()
    } catch (e) {
    } finally {
      setDisconnecting(false)
    }
  }, [refresh, topic, web3Wallet])

  return (
    <div className="w-full bg-gray-800 p-[16px] rounded-[16px] flex items-center justify-between">
      <div>
        <p className="text-offWhite mt-[3px]">{metadata.name}</p>
        <p className="text-[14px]">{metadata.url}</p>
      </div>
      <div className="flex items-center gap-[12px]">
        <Tooltip content="Visit site">
          <Button size="icon" variant="secondary" asLink to={metadata.url} target="_blank">
            <ExternalLink size={16} />
          </Button>
        </Tooltip>
        <Tooltip content="Disconnect">
          <Button size="icon" variant="secondary" disabled={!web3Wallet || disconnecting} onClick={disconnectSession}>
            {disconnecting ? <CircularProgressIndicator size={16} /> : <Unlink size={16} />}
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}

export const WalletConnectSessionsPage: React.FC = () => {
  const [selectedMultisig] = useSelectedMultisig()
  const { sessions, refresh, web3Wallet } = useWalletConnectSessions(selectedMultisig.proxyAddress)
  const [disconnecting, setDisconnecting] = useState(false)

  const disconnectAll = useCallback(async () => {
    if (!web3Wallet) return
    setDisconnecting(true)
    try {
      const allSessions = web3Wallet.getActiveSessions()
      const disconnects = []
      for (const session of Object.values(allSessions)) {
        disconnects.push(
          web3Wallet
            .disconnectSession({ topic: session.topic, reason: getSdkError('USER_DISCONNECTED') })
            .catch(console.error)
        )
      }
      await Promise.all(disconnects)
      refresh()
    } catch (e) {
      console.error('Error when disconnecting all wallet connect sessions', e)
    } finally {
      setDisconnecting(false)
    }
  }, [refresh, web3Wallet])

  return (
    <div className="flex flex-1 py-[32px] px-[8%] flex-col gap-[16px] w-1">
      <Button size="lg" variant="secondary" asLink to="/wallet-connect">
        Back
      </Button>
      <h1>Wallet Connect Active Sessions</h1>

      {sessions.length === 0 ? (
        <p>You don't have any active session.</p>
      ) : (
        <div>
          <div className="w-full flex items-center justify-between mb-[8px]">
            {disconnecting && <StatusMessage type="loading" message="Disconnecting all..." />}
            <Button className="ml-auto" size="sm" variant="ghost" onClick={disconnectAll} disabled={disconnecting}>
              Disconnect All
            </Button>
          </div>
          <div className="grid gap-[16px]">
            {sessions.map(session => (
              <Row key={session.topic} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

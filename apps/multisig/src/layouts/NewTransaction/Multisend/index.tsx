import { buildTransferExtrinsic } from '@domains/chains'

import { pjsApiSelector } from '@domains/chains/pjs-api'
import { selectedMultisigChainTokensState, useSelectedMultisig } from '@domains/multisig'
import { hasPermission } from '@domains/proxy/util'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecoilValueLoadable } from 'recoil'

import { MultiSendSend } from './multisend.types'
import MultiSendForm from './MultiSendForm'
import { Layout } from '../../Layout'
import { NewTransactionHeader } from '../NewTransactionHeader'
import { Share2 } from '@talismn/icons'
import { TransactionSidesheet } from '@components/TransactionSidesheet.tsx'
import { useToast } from '@components/ui/use-toast'

enum Step {
  Details,
  Review,
}

const MultiSend = () => {
  const [step, setStep] = useState(Step.Details)
  const [name, setName] = useState('')
  const tokens = useRecoilValueLoadable(selectedMultisigChainTokensState)
  const [extrinsic, setExtrinsic] = useState<SubmittableExtrinsic<'promise'> | undefined>()
  const [sends, setSends] = useState<MultiSendSend[]>([])
  const [multisig] = useSelectedMultisig()
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(multisig.chain.rpcs))
  const navigate = useNavigate()
  const { toast } = useToast()
  const permissions = hasPermission(multisig, 'transfer')

  useEffect(() => {
    if (sends.length > 0 && apiLoadable.state === 'hasValue') {
      if (
        !apiLoadable.contents.tx.balances?.transferKeepAlive ||
        !apiLoadable.contents.tx.proxy?.proxy ||
        !apiLoadable.contents.tx.utility?.batchAll
      ) {
        throw Error('chain missing required pallet/s for multisend')
      }
      try {
        const sendExtrinsics = sends.map(send => {
          const balance = {
            amount: send.amountBn,
            token: send.token,
          }
          return buildTransferExtrinsic(apiLoadable.contents, send.address, balance)
        })

        const batchAllExtrinsic = apiLoadable.contents.tx.utility.batchAll(sendExtrinsics)
        setExtrinsic(batchAllExtrinsic)
      } catch (error) {
        console.error(error)
      }
    }
  }, [sends, apiLoadable, multisig.proxyAddress])

  return (
    <Layout selected="Multi-send" requiresMultisig>
      <div css={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '32px 8%' }}>
        <div css={{ width: '100%', maxWidth: 620 }}>
          <NewTransactionHeader icon={<Share2 />}>Multi-send</NewTransactionHeader>
          <MultiSendForm
            {...permissions}
            name={name}
            setName={setName}
            tokens={tokens}
            onNext={() => setStep(Step.Review)}
            sends={sends}
            setSends={setSends}
          />
        </div>
        {extrinsic && (
          <TransactionSidesheet
            open={step === Step.Review}
            onClose={() => setStep(Step.Details)}
            calldata={extrinsic?.method.toHex()}
            description={name}
            onApproved={() => {
              toast({ title: 'Transaction successful!' })
              navigate('/overview')
            }}
            onApproveFailed={e => {
              setStep(Step.Details)
              console.error(e)
              toast({
                title: 'Transaction failed',
                description: e.message,
              })
            }}
          />
        )}
      </div>
    </Layout>
  )
}

export default MultiSend

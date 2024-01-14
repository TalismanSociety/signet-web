import 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/theme-twilight'
import 'ace-builds/src-noconflict/ext-language_tools'

import { SubmittableExtrinsic } from '@polkadot/api/types'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DetailsForm } from './DetailsForm'
import { Layout } from '../../Layout'
import { TransactionSidesheet } from '@components/TransactionSidesheet.tsx'
import { useToast } from '@components/ui/use-toast'

enum Step {
  Details,
  Review,
}

const AdvancedAction = () => {
  const [step, setStep] = useState(Step.Details)
  const [name, setName] = useState('')
  const [extrinsic, setExtrinsic] = useState<SubmittableExtrinsic<'promise'> | undefined>()
  const navigate = useNavigate()
  const { toast } = useToast()

  return (
    <Layout selected="Call data" requiresMultisig>
      <div css={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '32px 8%' }}>
        {step === Step.Details || step === Step.Review ? (
          <DetailsForm
            name={name}
            setName={setName}
            onNext={() => setStep(Step.Review)}
            extrinsic={extrinsic}
            setExtrinsic={setExtrinsic}
          />
        ) : null}
        {extrinsic && (
          <TransactionSidesheet
            description={name}
            calldata={extrinsic.method.toHex()}
            open={step === Step.Review}
            onClose={() => setStep(Step.Details)}
            onApproved={() => {
              navigate('/overview')
              toast({ title: 'Transaction sent!' })
            }}
            onApproveFailed={e => {
              setStep(Step.Details)
              toast({ title: 'Transaction failed', description: e.message })
            }}
          />
        )}
      </div>
    </Layout>
  )
}

export default AdvancedAction

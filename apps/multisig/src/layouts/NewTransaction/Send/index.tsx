import { BaseToken, buildTransferExtrinsic } from '@domains/chains'
import { pjsApiSelector } from '@domains/chains/pjs-api'
import { selectedMultisigChainTokensState, selectedMultisigState } from '@domains/multisig'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { Address } from '@util/addresses'
import BN from 'bn.js'
import Decimal from 'decimal.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecoilValue, useRecoilValueLoadable } from 'recoil'

import { Layout } from '../../Layout'
import { DetailsForm } from './DetailsForm'
import { TransactionSidesheet } from '@components/TransactionSidesheet.tsx'

enum Step {
  Details,
  Review,
}

const SendAction = () => {
  const [step, setStep] = useState(Step.Details)
  const [name, setName] = useState('')
  const [destinationAddress, setDestinationAddress] = useState<Address | undefined>()
  const [extrinsic, setExtrinsic] = useState<SubmittableExtrinsic<'promise'> | undefined>()
  const tokens = useRecoilValueLoadable(selectedMultisigChainTokensState)
  const [selectedToken, setSelectedToken] = useState<BaseToken | undefined>()
  const [amountInput, setAmountInput] = useState('')
  const multisig = useRecoilValue(selectedMultisigState)
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(multisig.chain.rpcs))
  const navigate = useNavigate()

  const defaultName = name || `Send ${selectedToken?.symbol || 'Token'}`

  useEffect(() => {
    if (!selectedToken && tokens.state === 'hasValue' && tokens.contents.length > 0) {
      setSelectedToken(tokens.contents[0])
    }
  }, [tokens, selectedToken])

  const amountBn: BN | undefined = useMemo(() => {
    if (!selectedToken || isNaN(parseFloat(amountInput))) return

    let stringValueRounded = new Decimal(amountInput)
      .mul(Decimal.pow(10, selectedToken.decimals))
      .toDecimalPlaces(0) // to round it
      .toFixed() // convert it back to string
    return new BN(stringValueRounded)
  }, [amountInput, selectedToken])

  useEffect(() => {
    if (selectedToken && apiLoadable.state === 'hasValue' && amountBn && destinationAddress) {
      if (!apiLoadable.contents.tx.balances?.transferKeepAlive || !apiLoadable.contents.tx.proxy?.proxy) {
        throw Error('chain missing balances pallet')
      }
      try {
        const balance = {
          amount: amountBn,
          token: selectedToken,
        }
        const innerExtrinsic = buildTransferExtrinsic(apiLoadable.contents, destinationAddress, balance)
        setExtrinsic(innerExtrinsic)
      } catch (error) {
        console.error(error)
      }
    }
  }, [destinationAddress, selectedToken, apiLoadable, amountBn, multisig])

  const handleApproved = useCallback(() => {
    navigate('/overview')
  }, [navigate])

  return (
    <Layout selected="Send" requiresMultisig>
      <div css={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '32px 8%' }}>
        <div css={{ width: '100%', maxWidth: 490 }}>
          <DetailsForm
            onNext={() => setStep(Step.Review)}
            selectedToken={selectedToken}
            tokens={tokens.state === 'hasValue' ? tokens.contents : []}
            destinationAddress={destinationAddress}
            amount={amountInput}
            setDestinationAddress={setDestinationAddress}
            setAmount={setAmountInput}
            setSelectedToken={setSelectedToken}
            name={name}
            setName={setName}
          />

          {extrinsic && (
            <TransactionSidesheet
              description={name || defaultName}
              calldata={extrinsic.method.toHex()}
              open={step === Step.Review}
              onClose={() => setStep(Step.Details)}
              onApproved={handleApproved}
            />
          )}
          {/* <SideSheet
            onRequestDismiss={() => {
              setStep(Step.Details)
            }}
            onClose={() => {
              setStep(Step.Details)
            }}
            title={<FullScreenDialogTitle t={t} />}
            css={{
              header: {
                margin: '32px 48px',
              },
              height: '100vh',
              background: 'var(--color-grey800)',
              maxWidth: '781px',
              minWidth: '700px',
              width: '100%',
              padding: '0 !important',
            }}
            open={step === Step.Review}
          >
            <FullScreenDialogContents
              t={t}
              fee={approveAsMultiReady ? estimatedFee : undefined}
              canCancel={true}
              cancelButtonTextOverride="Back"
              onApprove={() =>
                new Promise((resolve, reject) => {
                  if (!hash || !extrinsic) {
                    toast.error("Couldn't get hash or extrinsic")
                    return
                  }
                  approveAsMulti({
                    metadata: {
                      description: defaultName,
                      callData: extrinsic.method.toHex(),
                    },
                    onSuccess: () => {
                      navigate('/overview')
                      toast.success('Transaction successful!', { duration: 5000, position: 'bottom-right' })
                      resolve()
                    },
                    onFailure: e => {
                      navigate('/overview')
                      toast.error('Transaction failed')
                      console.error(e)
                      reject()
                    },
                  })
                })
              }
              onCancel={() => {
                setStep(Step.Details)
                return Promise.resolve()
              }}
              transactionDetails={t ? <TransactionDetailsExpandable t={t} /> : null}
            />
          </SideSheet> */}
        </div>
      </div>
    </Layout>
  )
}

export default SendAction

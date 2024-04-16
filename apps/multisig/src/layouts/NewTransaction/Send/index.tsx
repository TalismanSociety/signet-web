import { BaseToken, buildTransferExtrinsic } from '@domains/chains'
import { pjsApiSelector } from '@domains/chains/pjs-api'
import { selectedMultisigChainTokensState, selectedMultisigState } from '@domains/multisig'
import { Address } from '@util/addresses'
import BN from 'bn.js'
import Decimal from 'decimal.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRecoilValue, useRecoilValueLoadable } from 'recoil'

import { DetailsForm, VestedSendConfig } from './DetailsForm'
import { TransactionSidesheet } from '@components/TransactionSidesheet'
import { useToast } from '@components/ui/use-toast'
import { useLatestBlockNumber } from '@domains/chains/useLatestBlockNumber'
import { expectedBlockTime } from '@domains/common/substratePolyfills'

enum Step {
  Details,
  Review,
}

const SendAction = () => {
  const [step, setStep] = useState(Step.Details)
  const [name, setName] = useState('')
  const [destinationAddress, setDestinationAddress] = useState<Address | undefined>()
  const tokens = useRecoilValueLoadable(selectedMultisigChainTokensState)
  const [selectedToken, setSelectedToken] = useState<BaseToken | undefined>()
  const [amountInput, setAmountInput] = useState('')
  const multisig = useRecoilValue(selectedMultisigState)
  const [vested, setVested] = useState<VestedSendConfig>({
    on: false,
    startBlock: 0,
    endBlock: 0,
    amountByBlock: false,
  })

  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(multisig.chain.genesisHash))
  const { toast } = useToast()
  const blockNumber = useLatestBlockNumber(multisig.chain.genesisHash)
  const blockTime = useMemo(() => {
    if (apiLoadable.state !== 'hasValue') return
    return expectedBlockTime(apiLoadable.contents)
  }, [apiLoadable])

  const [startBlock, endBlock] = useMemo(() => {
    if (blockTime === undefined || blockNumber === undefined) return [0, 0]
    const startBlock = (24 * 60 * 60 * 1000) / blockTime.toNumber() + blockNumber
    const endBlock = (30 * 24 * 60 * 60 * 1000) / blockTime.toNumber() + startBlock
    return [startBlock, endBlock]
  }, [blockNumber, blockTime])

  // set the default values to start in 1 day and end in 31 days
  useEffect(() => {
    if (vested.startBlock === 0 && vested.endBlock === 0 && startBlock && endBlock)
      setVested(prev => ({ ...prev, startBlock, endBlock }))
  }, [endBlock, startBlock, vested])

  // reset if chain is changed
  useEffect(() => {
    if (blockTime === undefined || blockNumber === undefined)
      setVested(prev => ({ ...prev, startBlock: 0, endBlock: 0 }))
  }, [blockNumber, blockTime])

  useEffect(() => {
    if (tokens.state === 'hasValue' && tokens.contents.length > 0) {
      if (!selectedToken || !tokens.contents.find(token => token.id === selectedToken.id))
        setSelectedToken(tokens.contents.find(token => token.id === token.chain.nativeToken.id) ?? tokens.contents[0])
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

  const amountPerBlockBn = useMemo(() => {
    if (!vested.on) return undefined
    if (!amountBn) return undefined
    if (vested.endBlock - vested.startBlock === 0) return new BN(0)
    return amountBn.div(new BN(vested.endBlock - vested.startBlock))
  }, [amountBn, vested.endBlock, vested.on, vested.startBlock])

  const { extrinsic, loading } = useMemo(() => {
    if (apiLoadable.state !== 'hasValue') return { loading: true }
    if (!selectedToken || !amountBn || !destinationAddress) return { loading: false }
    if (!apiLoadable.contents.tx.balances?.transferKeepAlive || !apiLoadable.contents.tx.proxy?.proxy)
      return { palletSupported: false, loading: false }

    try {
      const balance = { amount: amountBn, token: selectedToken }
      const extrinsic = buildTransferExtrinsic(apiLoadable.contents, destinationAddress, balance)
      return { extrinsic, palletSupported: true, loading: false }
    } catch (error) {
      return {}
    }
  }, [amountBn, apiLoadable.contents, apiLoadable.state, destinationAddress, selectedToken])

  const handleFailed = useCallback(
    (err: Error) => {
      setStep(Step.Details)
      toast({
        title: 'Transaction failed',
        description: err.message,
      })
    },
    [toast]
  )

  return (
    <>
      <div className="flex flex-1 flex-col py-[16px] md:py-[32px] md:px-[8%]">
        <div className="w-full max-w-[490px]">
          <DetailsForm
            vestingSupported={
              apiLoadable.state === 'hasValue'
                ? !!apiLoadable.contents.tx.vesting &&
                  !!apiLoadable.contents.tx.vesting.vestedTransfer &&
                  selectedToken?.type === 'substrate-native'
                : undefined
            }
            onNext={() => setStep(Step.Review)}
            selectedToken={selectedToken}
            tokens={tokens.state === 'hasValue' ? tokens.contents : []}
            destinationAddress={destinationAddress}
            amount={amountInput}
            setDestinationAddress={setDestinationAddress}
            setAmount={setAmountInput}
            setSelectedToken={token => {
              setSelectedToken(token)
              if (token.type !== 'substrate-native' && vested.on) {
                toast({ title: `Vesting is not supported for ${token.symbol} on ${multisig.chain.chainName}` })
                setVested({
                  ...vested,
                  on: false,
                })
              }
            }}
            name={name}
            setName={setName}
            chain={multisig.chain}
            vestedConfig={{
              ...vested,
              startBlock: vested.startBlock || startBlock,
              endBlock: vested.endBlock || endBlock,
            }}
            onChangeVestedConfig={setVested}
            currentBlock={blockNumber}
            blockTime={blockTime?.toNumber()}
            amountPerBlockBn={amountPerBlockBn}
            loading={loading}
          />

          {extrinsic && (
            <TransactionSidesheet
              description={name || name || `Send ${selectedToken?.symbol || 'Token'}`}
              calldata={extrinsic.method.toHex()}
              open={step === Step.Review}
              onClose={() => setStep(Step.Details)}
              onApproveFailed={handleFailed}
            />
          )}
        </div>
      </div>
    </>
  )
}

export default SendAction

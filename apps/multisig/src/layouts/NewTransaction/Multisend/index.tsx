import { buildTransferExtrinsic, tokenPriceState } from '@domains/chains'

import { pjsApiSelector } from '@domains/chains/pjs-api'
import { selectedMultisigChainTokensState, useSelectedMultisig } from '@domains/multisig'
import { hasPermission } from '@domains/proxy/util'
import { useCallback, useMemo, useState } from 'react'
import { useRecoilValue, useRecoilValueLoadable } from 'recoil'
import BN from 'bn.js'

import MultiSendForm from './MultiSendForm'
import { NewTransactionHeader } from '../NewTransactionHeader'
import { Share2 } from '@talismn/icons'
import { TransactionSidesheet } from '@components/TransactionSidesheet'
import { useToast } from '@components/ui/use-toast'
import { multisendAmountUnitAtom, multisendSendsAtom, multisendTokenAtom } from './MultisendTable/atom'
import { AmountUnit } from '@components/AmountUnitSelector'
import { parseUnits } from '@util/numbers'
import { useVestingScheduleCreator } from '@hooks/useVestingScheduleCreator'

enum Step {
  Details,
  Review,
}

const MultiSend = () => {
  const [step, setStep] = useState(Step.Details)
  const [name, setName] = useState('')
  const tokens = useRecoilValueLoadable(selectedMultisigChainTokensState)
  const [multisig] = useSelectedMultisig()
  const apiLoadable = useRecoilValueLoadable(pjsApiSelector(multisig.chain.genesisHash))
  const { toast } = useToast()
  const permissions = hasPermission(multisig, 'transfer')
  const newSends = useRecoilValue(multisendSendsAtom)
  const unit = useRecoilValue(multisendAmountUnitAtom)
  const token = useRecoilValue(multisendTokenAtom)
  const tokenPrices = useRecoilValueLoadable(tokenPriceState(token))
  const vestingScheduleCreator = useVestingScheduleCreator(multisig.chain.genesisHash)

  const parseAmount = useCallback(
    (amount: string) => {
      if (!token) return new BN(0)

      let tokenAmount = amount

      if (unit !== AmountUnit.Token) {
        if (tokenPrices.state === 'hasValue') {
          if (unit === AmountUnit.UsdMarket) {
            tokenAmount = (parseFloat(amount) / tokenPrices.contents.current).toString()
          } else if (unit === AmountUnit.Usd7DayEma) {
            if (!tokenPrices.contents.averages?.ema7) return new BN(0)
            tokenAmount = (parseFloat(amount) / tokenPrices.contents.averages.ema7).toString()
          } else if (unit === AmountUnit.Usd30DayEma) {
            if (!tokenPrices.contents.averages?.ema30) return new BN(0)
            tokenAmount = (parseFloat(amount) / tokenPrices.contents.averages.ema30).toString()
          }
        } else {
          return new BN(0)
        }
      }

      return parseUnits(tokenAmount, token.decimals)
    },
    [token, tokenPrices.contents, tokenPrices.state, unit]
  )

  const parsedSends = useMemo(() => {
    const sends = newSends.map(send => {
      if (
        !send ||
        (send.recipient === undefined && (send.amount === undefined || send.amount === '') && send.vested === undefined)
      )
        return null

      const sendAddressMatchesChain = send.recipient && send.recipient.isEthereum === multisig.isEthereumAccount
      if (!send.amount || !send.recipient || !sendAddressMatchesChain) return undefined
      const amountBN = parseAmount(send.amount)
      return {
        recipient: send.recipient,
        amountBN,
        vestingSchedule: send.vested,
      }
    })

    return sends.filter(send => send !== null)
  }, [multisig.isEthereumAccount, newSends, parseAmount])

  const { hasInvalidSend, totalAmount, validSends } = useMemo(() => {
    const validSends = parsedSends.filter(send => send !== undefined)
    const hasInvalidSend = parsedSends.some(send => send === undefined)
    const totalAmount = validSends.reduce((acc, send) => acc.add(send!.amountBN), new BN(0))
    return {
      validSends,
      hasInvalidSend,
      totalAmount,
    }
  }, [parsedSends])

  const extrinsic = useMemo(() => {
    if (validSends.length > 0 && apiLoadable.state === 'hasValue' && token && vestingScheduleCreator) {
      if (
        !apiLoadable.contents.tx.balances?.transferKeepAlive ||
        !apiLoadable.contents.tx.proxy?.proxy ||
        !apiLoadable.contents.tx.utility?.batchAll
      ) {
        throw Error('chain missing required pallet/s for multisend')
      }
      try {
        const sendExtrinsics = validSends.map(send => {
          const balance = { amount: send!.amountBN, token }
          return buildTransferExtrinsic(
            apiLoadable.contents,
            send!.recipient,
            balance,
            send?.vestingSchedule
              ? vestingScheduleCreator(
                  balance.amount,
                  send.vestingSchedule.start,
                  send.vestingSchedule.end - send.vestingSchedule.start
                )
              : undefined
          )
        })

        return apiLoadable.contents.tx.utility.batchAll(sendExtrinsics)
      } catch (error) {
        console.error(error)
      }
    }
  }, [apiLoadable.contents, apiLoadable.state, token, validSends, vestingScheduleCreator])

  return (
    <>
      <div className="flex flex-1 flex-col py-[32px] px-[8%]">
        <div className="w-full max-w-[720px]">
          <NewTransactionHeader icon={<Share2 />} title="Multi-send" />
          <MultiSendForm
            {...permissions}
            name={name}
            setName={setName}
            tokens={tokens}
            onNext={() => setStep(Step.Review)}
            chain={multisig.chain}
            totalAmount={totalAmount}
            totalSends={validSends.length}
            disabled={hasInvalidSend}
            disableVesting={!vestingScheduleCreator}
          />
        </div>
        {extrinsic && (
          <TransactionSidesheet
            open={step === Step.Review}
            onClose={() => setStep(Step.Details)}
            calldata={extrinsic?.method.toHex()}
            description={name}
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
    </>
  )
}

export default MultiSend

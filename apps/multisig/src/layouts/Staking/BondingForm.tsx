import { Input } from '@components/ui/input'
import { useNativeToken } from '@domains/chains'
import { useSelectedMultisig } from '@domains/multisig'
import React, { useState } from 'react'
import { useRecoilValueLoadable } from 'recoil'
import { formatUnits, parseUnits } from '../../util/numbers'
import { Skeleton } from '@talismn/ui'
import { Button } from '@components/ui/button'
import { TransactionSidesheet } from '@components/TransactionSidesheet'
import { useBondExtrinsic } from '@domains/staking/useBondExtrinsic'
import { minNominatorBondAtom, stakingLedgerAtom } from '@domains/staking'
import { useBondExtraExtrinsic } from '@domains/staking/useBondExtraExtrinsic'

export const BondingForm: React.FC = () => {
  const [multisig] = useSelectedMultisig()
  const [reviewing, setReviewing] = useState(false)
  const token = useNativeToken(multisig.chain.nativeToken.id)
  const minNominatorBondLoadable = useRecoilValueLoadable(minNominatorBondAtom(multisig.chain.genesisHash))

  const stakingLedger = useRecoilValueLoadable(
    stakingLedgerAtom(`${multisig.chain.genesisHash}-${multisig.proxyAddress.toSs58()}`)
  )
  const stakedAmount = stakingLedger.state === 'hasValue' ? stakingLedger.contents?.active.toBigInt() : undefined

  const [amountString, setAmountString] = React.useState('')
  const amount = React.useMemo(() => {
    try {
      if (!token.nativeToken) return 0n
      return BigInt(parseUnits(amountString, token.nativeToken?.decimals).toString())
    } catch (e) {
      return 0n
    }
  }, [amountString, token.nativeToken])

  const { extrinsic } = useBondExtrinsic(amount)
  const { extrinsic: bondExtraExtrinsic } = useBondExtraExtrinsic(amount)

  return (
    <div className="max-w-[560px] w-full flex flex-col gap-[8px]">
      {/* <p className="font-bold text-offWhite">Bond {token.nativeToken?.symbol}</p> */}
      <p className="text-[14px]">
        You must bond <span className="text-offWhite">{token.nativeToken?.symbol}</span> before you can start nominating
        with your proxied account.
      </p>

      <Input
        placeholder="0.00"
        suffix={token.nativeToken?.symbol}
        value={amountString}
        onChange={e => setAmountString(e.target.value)}
      />

      {minNominatorBondLoadable.state === 'loading' || !token.nativeToken ? (
        <Skeleton.Surface className="w-[120px] h-[16px]" />
      ) : minNominatorBondLoadable.state === 'hasError' ? (
        <p className="text-[14px]">Couldn&apos;t load minium bond amount.</p>
      ) : (
        <p className="text-[14px]">
          Minimum bond amount:{' '}
          <span
            className="text-offWhite hover:opacity-70 cursor-pointer"
            onClick={() => {
              if (token.nativeToken)
                setAmountString(formatUnits(minNominatorBondLoadable.contents, token.nativeToken.decimals))
            }}
          >
            {formatUnits(minNominatorBondLoadable.contents, token.nativeToken.decimals)} {token.nativeToken.symbol}
          </span>
        </p>
      )}

      <Button className="w-max" onClick={() => setReviewing(true)} disabled={!amount || stakedAmount === undefined}>
        Bond {token.nativeToken?.symbol}
      </Button>

      {bondExtraExtrinsic && stakedAmount !== undefined && stakedAmount > 0n && (
        <TransactionSidesheet
          calldata={bondExtraExtrinsic.method.toHex()}
          description={`Bond extra ${amountString} ${token.nativeToken?.symbol}`}
          open={reviewing}
          onClose={() => setReviewing(false)}
        />
      )}
      {extrinsic && stakedAmount === 0n && (
        <TransactionSidesheet
          calldata={extrinsic.method.toHex()}
          description={`Bond ${amountString} ${token.nativeToken?.symbol}`}
          open={reviewing}
          onClose={() => setReviewing(false)}
        />
      )}
    </div>
  )
}

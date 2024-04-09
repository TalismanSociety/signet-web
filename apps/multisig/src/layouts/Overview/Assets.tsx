import { BaseToken } from '@domains/chains'
import { css } from '@emotion/css'
import { Balance } from '@talismn/balances'
import { Lock } from '@talismn/icons'
import { AnimatedNumber, Skeleton } from '@talismn/ui'
import { formatDecimals } from '@talismn/util'
import { formatUsd } from '@util/numbers'
import { capitalizeFirstLetter } from '@util/strings'
import { useMemo } from 'react'

export interface TokenAugmented {
  id: string
  details: BaseToken
  balance: {
    avaliable: number
    unavaliable: number
  }
  balanceDetails: Balance
  price: number
}

const TokenRow = ({ augmentedToken, balance }: { augmentedToken: TokenAugmented; balance: number }) => {
  const { details, price } = augmentedToken
  return (
    <div
      className={css`
        height: 43px;
        width: 100%;
        display: flex;
        div > p:nth-child(1) {
          font-weight: bold;
          color: var(--color-offWhite);
        }
        div > p:nth-child(2) {
          font-size: 14px;
        }
      `}
    >
      <img className="h-[40px] w-[40px] mr-[8px]" width={40} height={40} src={details.logo} alt="Token logo" />
      <div>
        <p>{details.symbol}</p>
        <p>{capitalizeFirstLetter(details.chain.chainName)}</p>
      </div>
      <div css={{ marginLeft: 'auto', textAlign: 'right' }}>
        <p>
          {formatDecimals(balance)} {details.symbol}
        </p>
        <p>{formatUsd(balance * price)}</p>
      </div>
    </div>
  )
}

const Assets = ({ augmentedTokens }: { augmentedTokens?: TokenAugmented[] }) => {
  const totalFiatBalance = useMemo(() => {
    if (!augmentedTokens) return undefined
    return augmentedTokens.reduce(
      (acc, { balance, price }) => acc + (balance.avaliable + balance.unavaliable) * price,
      0
    )
  }, [augmentedTokens])
  const totalUnavaliableBalance = useMemo(() => {
    if (!augmentedTokens) return undefined
    return augmentedTokens.reduce((acc, { balance }) => acc + balance.unavaliable, 0)
  }, [augmentedTokens])
  const totalAvaliableBalance = useMemo(() => {
    if (!augmentedTokens) return undefined
    return augmentedTokens.reduce((acc, { balance }) => acc + balance.avaliable, 0)
  }, [augmentedTokens])

  const avaliableSorted = useMemo(() => {
    if (!augmentedTokens) return undefined
    return augmentedTokens
      .filter(({ balance }) => balance.avaliable > 0)
      .sort((a1, a2) => a2.balance.avaliable * a2.price - a1.balance.avaliable * a1.price)
  }, [augmentedTokens])

  const unavaliableSorted = useMemo(() => {
    if (!augmentedTokens) return undefined
    return augmentedTokens
      .filter(({ balance }) => balance.unavaliable > 0)
      .sort((a1, a2) => a2.balance.unavaliable * a2.price - a1.balance.unavaliable * a1.price)
  }, [augmentedTokens])

  return (
    <section className="bg-gray-800 rounded-[16px] flex flex-col gap-[16px] h-full p-[24px]">
      <div className="flex justify-between items-center">
        <h2 className="text-offWhite font-bold">Assets</h2>
        {totalFiatBalance === undefined ? (
          <Skeleton.Surface className="h-[29px] w-[100px]" />
        ) : (
          <h2 className="font-bold">
            <AnimatedNumber formatter={formatUsd} end={totalFiatBalance} decimals={2} />
          </h2>
        )}
      </div>
      {totalAvaliableBalance === undefined ||
      totalUnavaliableBalance === undefined ||
      !avaliableSorted ||
      !unavaliableSorted ? (
        <div className="grid gap-[16px]">
          <p className="text-gray-400 font-bold">Avaliable</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[8px]">
              <Skeleton.Surface className="w-[40px] h-[40px] !rounded-full" />
              <div>
                <Skeleton.Surface className="w-[48px] h-[20px]" />
                <Skeleton.Surface className="w-[55px] h-[20px] mt-[2px]" />
              </div>
            </div>
            <div className="flex flex-col items-end">
              <Skeleton.Surface className="w-[62px] h-[20px]" />
              <Skeleton.Surface className="w-[42px] h-[20px] mt-[2px]" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {totalAvaliableBalance > 0 ? (
            <div className="grid gap-[16px]">
              <p className="text-gray-300 font-bold">Avaliable</p>
              {avaliableSorted.map(augmentedToken => {
                return (
                  <TokenRow
                    key={augmentedToken.id}
                    augmentedToken={augmentedToken}
                    balance={augmentedToken.balance.avaliable}
                  />
                )
              })}
            </div>
          ) : null}
          {totalUnavaliableBalance > 0 ? (
            <div className="grid gap-[16px]">
              <div className="flex items-center">
                <p className="text-gray-300 font-bold">Unavaliable</p>
                <Lock className="h-[16px] text-gray-300" />
              </div>
              {unavaliableSorted.map(augmentedToken => {
                return (
                  <TokenRow
                    key={augmentedToken.id}
                    augmentedToken={augmentedToken}
                    balance={augmentedToken.balance.unavaliable}
                  />
                )
              })}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

export default Assets

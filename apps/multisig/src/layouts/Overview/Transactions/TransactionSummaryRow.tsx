import StatusCircle, { StatusCircleType } from '@components/StatusCircle'
import { tokenPricesState } from '@domains/chains'
import {
  Balance,
  Transaction,
  TransactionType,
  calcSumOutgoing,
  combinedViewState,
  toConfirmedTxUrl,
} from '@domains/multisig'
import { ArrowUp, Contract, List, Settings, Share2, Unknown, Vote, Zap } from '@talismn/icons'
import { Skeleton } from '@talismn/ui'
import { balanceToFloat, formatUsd } from '@util/numbers'
import { useMemo } from 'react'
import { useRecoilValue, useRecoilValueLoadable } from 'recoil'
import truncateMiddle from 'truncate-middle'
import { formattedDate, formattedHhMm } from './utils'

const TransactionSummaryRow = ({
  t,
  onClick,
  shortDate,
  showDraftBadge,
}: {
  t: Transaction
  onClick?: () => void
  shortDate: boolean
  showDraftBadge?: boolean
}) => {
  const sumOutgoing: Balance[] = useMemo(() => calcSumOutgoing(t), [t])
  const combinedView = useRecoilValue(combinedViewState)
  const tokenPrices = useRecoilValueLoadable(tokenPricesState(sumOutgoing.map(b => b.token)))
  const { threshold } = t.multisig
  const sumPriceUsd: number | undefined = useMemo(() => {
    if (tokenPrices.state === 'hasValue') {
      return sumOutgoing.reduce((acc, b) => {
        const price = b.token.coingeckoId ? tokenPrices.contents[b.token.coingeckoId] || { current: 0 } : { current: 0 }
        return acc + balanceToFloat(b) * price.current
      }, 0)
    }
    return undefined
  }, [sumOutgoing, tokenPrices])

  const signedCount = Object.values(t.approvals).filter(Boolean).length
  const txIcon = !t.decoded ? (
    <Unknown />
  ) : t.decoded.type === TransactionType.Transfer ? (
    <ArrowUp />
  ) : t.decoded.type === TransactionType.MultiSend ? (
    <Share2 />
  ) : t.decoded.type === TransactionType.ChangeConfig ? (
    <Settings />
  ) : t.decoded.type === TransactionType.Vote ? (
    <Vote />
  ) : t.decoded.type === TransactionType.NominateFromNomPool ||
    t.decoded.type === TransactionType.NominateFromStaking ? (
    <Zap />
  ) : t.decoded.type === TransactionType.ContractCall ? (
    <Contract />
  ) : (
    <List />
  )

  const tokenBreakdown = sumOutgoing.map(b => `${balanceToFloat(b)} ${b.token.symbol}`).join(' + ')
  return (
    <div onClick={onClick} className="flex items-center justify-between w-full gap-[16px]">
      <div className="flex items-center justify-start gap-[8px] w-full overflow-hidden">
        <div className="flex items-center justify-center min-w-[32px] w-[32px] h-[32px] bg-gray-500 [&>svg]:h-[15px] [&>svg]:w-[15px] rounded-full text-primary">
          {txIcon}
        </div>

        <div className="flex flex-col items-start overflow-hidden">
          <div className="flex items-center gap-[8px] text-offWhite overflow-hidden text-ellipsis w-full max-w-max">
            <p className="whitespace-nowrap overflow-hidden text-ellipsis leading-[16px] max-w-max w-full">
              {t.description}
            </p>
            {combinedView ? (
              <div className="flex items-center">
                <img
                  className="w-[16px] h-[16px] min-w-[16px]"
                  src={t.multisig.chain.logo}
                  alt={t.multisig.chain.chainName}
                />
                <p className="text-gray-200 text-[12px] leading-[12px] ml-[4px] mt-[2px] ">
                  {truncateMiddle(t.multisig.name, 24, 0, '...')}
                </p>
              </div>
            ) : null}
            {t.draft ? (
              showDraftBadge ? (
                <div className="text-orange-400 border rounded-[8px] px-[8px] pb-[2px]">
                  <p className="text-[12px] leading-[12px] !mt-[4px]">Draft</p>
                </div>
              ) : null
            ) : (
              !t.executedAt &&
              threshold !== signedCount && (
                <div className="flex items-center justify-center rounded-[12px] bg-gray-500 text-[11px] text-offWhite pt-[2px] h-[16px] px-[4px]">
                  {signedCount}/{threshold}
                </div>
              )
            )}
          </div>
          <p className="text-[12px] mt-[2px]">{shortDate ? formattedHhMm(t.date) : formattedDate(t.date)}</p>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <div className="flex flex-col items-end">
          <p className="text-right text-offWhite leading-[16px] whitespace-nowrap">{tokenBreakdown}</p>
          <div className="text-right text-[14px]">
            {tokenBreakdown.length === 0 ? null : sumPriceUsd !== undefined ? (
              <>{formatUsd(sumPriceUsd)}</>
            ) : (
              <Skeleton.Surface css={{ marginLeft: 'auto', height: '14px', width: '42px' }} />
            )}
          </div>
        </div>
        {t.executedAt && t.hash && (
          <a
            className="ml-[24px]"
            href={toConfirmedTxUrl(t)}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
          >
            <StatusCircle
              type={StatusCircleType.Success}
              circleDiameter="24px"
              iconDimentions={{ width: '11px', height: 'auto' }}
            />
          </a>
        )}
      </div>
    </div>
  )
}

export default TransactionSummaryRow

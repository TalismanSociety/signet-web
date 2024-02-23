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
import { Contract, List, Send, Settings, Share2, Unknown, Vote, Zap } from '@talismn/icons'
import { Skeleton } from '@talismn/ui'
import { balanceToFloat, formatUsd } from '@util/numbers'
import { useMemo } from 'react'
import { useRecoilValue, useRecoilValueLoadable } from 'recoil'
import truncateMiddle from 'truncate-middle'
import { formattedDate, formattedHhMm } from './utils'
import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { useKnownAddresses } from '@hooks/useKnownAddresses'
import { Upload } from 'lucide-react'
import { Tooltip } from '@components/ui/tooltip'

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
  const { contactByAddress } = useKnownAddresses(t.multisig.id)
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

  const priceUnavailable = useMemo(() => {
    if (tokenPrices.state === 'loading') return true
    const tokenPricesLength = Object.values(tokenPrices.contents).length
    return tokenPricesLength !== sumOutgoing.length
  }, [sumOutgoing.length, tokenPrices.contents, tokenPrices.state])

  const signedCount = Object.values(t.approvals).filter(Boolean).length
  const txIcon = !t.decoded ? (
    <Unknown />
  ) : t.decoded.type === TransactionType.Transfer ? (
    <Send />
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
  ) : t.decoded.type === TransactionType.DeployContract ? (
    <Upload />
  ) : (
    <List />
  )

  const tokenBreakdown = sumOutgoing.map(b => `${balanceToFloat(b)} ${b.token.symbol}`).join(' + ')
  return (
    <div onClick={onClick} className="flex items-center justify-between w-full gap-[16px]">
      <div className="flex items-center justify-start gap-[8px] w-full overflow-x-hidden">
        <div className="flex items-center justify-center min-w-[36px] w-[36px] h-[36px] bg-gray-500 [&>svg]:h-[15px] [&>svg]:w-[15px] rounded-full text-primary">
          {txIcon}
        </div>

        <div className="flex flex-col items-start gap-[2px] w-1 flex-1">
          <div className="flex items-center gap-[8px] text-offWhite pt-[4px] w-full">
            <p className="whitespace-nowrap leading-[16px] pt-[6px] w-full overflow-hidden text-ellipsis overflow-y-visible max-w-max">
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
                <div className="text-orange-400 border rounded-[8px] px-[6px] pb-[2px] min-w-max">
                  <p className="text-[11px] leading-[11px] !mt-[3px]">Draft</p>
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
          <div className="flex items-center justify-start">
            <p className="text-[12px] mt-[2px] leading-[12px] whitespace-nowrap">
              {shortDate ? formattedHhMm(t.date) : formattedDate(t.date)}
            </p>
            {t.draft && (
              <div className="flex items-center justify-start gap-[8px] ml-[8px]">
                <div className="w-[3px] h-[3px] bg-gray-200 rounded-full" />
                <div className=" [&>div>div>p]:!text-[12px] [&>div>p]:!text-[12px] [&>div]:gap-[4px] [&>div>div]:!min-w-[16px] [&>div>div>svg]:!w-[16px] [&>div>div>svg]:!h-[16px] flex items-center">
                  <p className="text-[12px] mr-[4px] whitespace-nowrap mt-[3px]">Drafted by</p>
                  <AccountDetails
                    address={t.draft.creator.address}
                    name={contactByAddress?.[t.draft.creator.address.toSs58()]?.name}
                    withAddressTooltip
                    nameOrAddressOnly
                    disableCopy
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <div className="flex flex-col items-end">
          <p className="text-right text-offWhite leading-[16px] whitespace-nowrap">{tokenBreakdown}</p>
          <div className="text-right text-[14px]">
            {tokenBreakdown.length === 0 ? null : sumPriceUsd !== undefined ? (
              priceUnavailable ? null : (
                <>{formatUsd(sumPriceUsd)}</>
              )
            ) : (
              <Skeleton.Surface css={{ marginLeft: 'auto', height: '14px', width: '42px' }} />
            )}
          </div>
        </div>
        {t.executedAt && t.hash && (
          <a
            className="ml-[8px] lg:ml-[24px]"
            href={toConfirmedTxUrl(t)}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
          >
            {t.executedAt.errors ? (
              <Tooltip
                content={
                  <p className="text-[12px]">
                    {!!t.executedAt.errors.proxyError && `Proxy call failed: ${t.executedAt.errors.proxyError}`}
                  </p>
                }
              >
                <div>
                  <StatusCircle
                    type={StatusCircleType.Error}
                    circleDiameter="24px"
                    iconDimentions={{ width: '11px', height: 'auto' }}
                  />
                </div>
              </Tooltip>
            ) : (
              <StatusCircle
                type={StatusCircleType.Success}
                circleDiameter="24px"
                iconDimentions={{ width: '11px', height: 'auto' }}
              />
            )}
          </a>
        )}
      </div>
    </div>
  )
}

export default TransactionSummaryRow

import { balancesState } from '@domains/balances'
import { Balance, BalanceFormatter } from '@talismn/balances'
import { AnimatedNumber, CircularProgressIndicator, Skeleton } from '@talismn/ui'
import { formatUsd } from '@util/numbers'
import { capitalizeFirstLetter } from '@util/strings'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { formatDecimals } from '@talismn/util'
import { useSelectedMultisig } from '@domains/multisig'
import { Address } from '@util/addresses'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion'
import { cn } from '@util/tailwindcss'
import { supportedChains } from '@domains/chains/generated-chains'
import { DEFAULT_CURRENCY } from '@util/constants'

const Amount: React.FC<{ balanceFormatter: BalanceFormatter; symbol: string; loading?: boolean }> = ({
  balanceFormatter,
  symbol,
  loading,
}) => (
  <div className="flex flex-col items-end gap-[4px]">
    <div className="flex items-center gap-[4px]">
      {loading && <CircularProgressIndicator size={16} />}
      <p
        className={cn(
          'text-[16px] leading-none font-bold text-offWhite text-right',
          loading ? 'animate-pulse opacity-30' : ''
        )}
      >
        {formatDecimals(balanceFormatter.tokens)}
        <span className="hidden sm:inline"> {symbol}</span>
      </p>
    </div>
    <p className={cn('text-[12px] leading-none text-right', loading ? 'animate-pulse opacity-30' : '')}>
      ${balanceFormatter.fiat('usd')?.toFixed(2) || '0.00'}
    </p>
  </div>
)

const BalanceDetails: React.FC<{
  balanceFormatter: BalanceFormatter
  label: string
  symbol: string
  loading?: boolean
}> = ({ balanceFormatter, label, symbol, loading }) =>
  balanceFormatter.planck === 0n ? null : (
    <div className="flex items-center justify-between">
      <p>{label}</p>
      <Amount balanceFormatter={balanceFormatter} symbol={symbol} loading={loading} />
    </div>
  )

const TokenRow: React.FC<{ balance: Balance }> = ({ balance }) => {
  const loading = balance.status !== 'live'
  const balanceToken = supportedChains.find(chain => chain.nativeToken?.id === balance.token?.id)
  return (
    <AccordionItem
      value={balance.id}
      className="border-b-0 [&[data-state=open]]:bg-gray-950 rounded-[12px] overflow-hidden"
    >
      <AccordionTrigger className="hover:bg-gray-900 p-[12px] py-[8px] pr-[8px] rounded-[12px] [&[data-state=open]]:bg-gray-900">
        <div className="w-full flex items-center pr-[8px]">
          <img
            className="h-[36px] w-[36px] mr-[8px]"
            width={36}
            height={36}
            src={balanceToken?.logo || balance.token?.logo}
            alt="Token logo"
          />
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col gap-[4px]">
              <p className="text-[16px] leading-none font-bold text-offWhite text-left">{balance.token?.symbol}</p>
              <p className="text-[12px] leading-none text-left">
                {capitalizeFirstLetter(balance.chain?.chainName || '')}
              </p>
            </div>
            <Amount balanceFormatter={balance.transferable} symbol={balance.token?.symbol || ''} loading={loading} />
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-[12px] gap-[8px] grid">
        <BalanceDetails
          balanceFormatter={balance.transferable}
          label="Available"
          symbol={balance.token?.symbol || ''}
          loading={loading}
        />
        <BalanceDetails
          balanceFormatter={balance.reserved}
          label="Reserved"
          symbol={balance.token?.symbol || ''}
          loading={loading}
        />
        <BalanceDetails
          balanceFormatter={balance.locked}
          label="Locked"
          symbol={balance.token?.symbol || ''}
          loading={loading}
        />
      </AccordionContent>
    </AccordionItem>
  )
}

const Assets: React.FC = () => {
  const balances = useRecoilValue(balancesState)
  const [multisig] = useSelectedMultisig()

  const substrateBalances = useMemo(() => {
    if (!balances) return undefined
    const substrateTokensFilter = (b: Balance) => {
      const balanceOwnerAddress = Address.fromSs58(b.address)
      if (!balanceOwnerAddress || !balanceOwnerAddress.isEqual(multisig.proxyAddress)) return false
      return (
        b.token?.type === 'substrate-native' ||
        b.token?.type === 'substrate-assets' ||
        b.token?.type === 'substrate-tokens'
      )
    }
    return balances.filterNonZeroFiat('total', DEFAULT_CURRENCY).find(substrateTokensFilter)
  }, [balances, multisig.proxyAddress])

  return (
    <section className="bg-gray-800 rounded-[16px] flex flex-col gap-[16px] h-full p-[24px]">
      <div className="flex justify-between items-center">
        <h2 className="text-offWhite font-bold">Assets</h2>
        {substrateBalances === undefined ? (
          <Skeleton.Surface className="h-[29px] w-[100px]" />
        ) : (
          <h2 className="font-bold">
            <AnimatedNumber formatter={formatUsd} end={substrateBalances.sum.fiat('usd').total} decimals={2} />
          </h2>
        )}
      </div>
      {substrateBalances === undefined ? (
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
      ) : substrateBalances.count > 0 ? (
        <Accordion type="multiple" className="grid gap-[8px]">
          {substrateBalances.sorted.map(balance => (
            <TokenRow key={balance.id} balance={balance} />
          ))}
        </Accordion>
      ) : null}
    </section>
  )
}

export default Assets

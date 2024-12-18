import { useSelectedMultisig } from '@domains/multisig'
import { BalanceCard } from './BalanceCard'
import NominationsOverview from './NominationsOverview'
import { useAugmentedBalances } from '@domains/balances'
import { useNativeToken } from '@domains/chains'
import { usePoolMembership } from '@domains/staking/usePoolMembership'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BondedPool, bondedPoolsAtom } from '@domains/nomination-pools'
import { Address } from '@util/addresses'
import { ValidatorsRotation } from './ValidatorsRotation'
import { useRecoilValueLoadable } from 'recoil'
import { u8aToString, u8aUnwrapBytes } from '@polkadot/util'
import { BondingForm } from './BondingForm'
import { stakingLedgerAtom } from '@domains/staking'
import { formatUnits } from '@util/numbers'
import { PageTabs, PageTabsContent, PageTabsList, PageTabsTrigger } from '@components/ui/page-tabs'

const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="flex flex-1 py-[16px] px-[8px] lg:px-[4%] flex-col gap-[16px] w-full">{children}</div>
)

const Staking = () => {
  const [multisig] = useSelectedMultisig()
  const { nativeToken } = useNativeToken(multisig.chain.nativeToken.id)
  const { membership } = usePoolMembership(multisig.proxyAddress, multisig.chain)
  const bondedPools = useRecoilValueLoadable(bondedPoolsAtom(multisig.chain.genesisHash))

  // user is editing nominations for a nom pool if `pool` exists
  // else we're editing via `staking` pallet
  const [editing, setEditing] = useState<{ address: Address; pool?: BondedPool } | undefined>()

  const augmentedTokens = useAugmentedBalances()
  const balance = augmentedTokens?.find(
    ({ details }) => details.id === multisig.chain.nativeToken.id || details.id.includes(multisig.chain.nativeToken.id)
  )

  const stakingLedger = useRecoilValueLoadable(
    stakingLedgerAtom(`${multisig.chain.genesisHash}-${multisig.proxyAddress.toSs58()}`)
  )
  const stakedAmount = stakingLedger.state === 'hasValue' ? stakingLedger.contents?.active.toBigInt() : undefined

  // total funds in pool, pallet is not supported when membership = null
  const pooledAmount = membership === null ? 0 : membership?.balance.toHuman().split(' ')[0]
  const memberOf = useMemo(() => {
    if (bondedPools.state !== 'hasValue') return undefined
    return bondedPools.contents.find(pool => pool.roles.root.isEqual(multisig.proxyAddress))
  }, [bondedPools.contents, bondedPools.state, multisig.proxyAddress])

  const handleEditNomPool = useCallback(
    (pool?: BondedPool) => {
      setEditing({ address: pool?.stash ?? multisig.proxyAddress, pool })
    },
    [multisig.proxyAddress]
  )

  useEffect(() => {
    setEditing(undefined)
  }, [multisig])

  if (editing) {
    return (
      <Wrapper>
        <ValidatorsRotation {...editing} onBack={() => setEditing(undefined)} />
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <h2 className="text-offWhite mt-[4px] font-bold">Staking Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[12px] w-full mb-[24px]">
        <BalanceCard
          symbol={nativeToken?.symbol}
          amount={balance?.balance.avaliable}
          price={balance?.price}
          label="Available"
        />
        <BalanceCard
          symbol={nativeToken?.symbol}
          amount={
            stakedAmount !== undefined && nativeToken ? +formatUnits(stakedAmount, nativeToken.decimals) : undefined
          }
          price={balance?.price}
          label="Bonded"
        />
        <BalanceCard
          symbol={nativeToken?.symbol}
          amount={membership === undefined ? undefined : +(pooledAmount ?? '0')}
          price={balance?.price}
          label="In Pool"
          description={
            memberOf ? (
              <span className="truncate text-[12px]">
                <span className="text-offWhite font-semibold">Pool #{memberOf.id}</span>{' '}
                {memberOf.metadata ? u8aToString(u8aUnwrapBytes(memberOf.metadata)) : ''}
              </span>
            ) : undefined
          }
        />
      </div>

      <PageTabs defaultValue="bond">
        <PageTabsList className="">
          <PageTabsTrigger value="bond" className="flex items-center gap-[4px]">
            <p className="font-bold text-[16px]">Bond {nativeToken?.symbol}</p>
          </PageTabsTrigger>
          <PageTabsTrigger value="nominate" className="flex items-center gap-[4px]">
            <p className="font-bold text-[16px]">Nominate Validators</p>
          </PageTabsTrigger>
          {/* <PageTabsTrigger value="pool" className="flex items-center gap-[4px]">
            <p className="font-bold text-[16px]">Join Pool</p>
          </PageTabsTrigger> */}
        </PageTabsList>

        <PageTabsContent value="bond">
          <BondingForm />
        </PageTabsContent>
        <PageTabsContent value="nominate">
          <NominationsOverview chain={multisig.chain} onEdit={handleEditNomPool} />
        </PageTabsContent>
      </PageTabs>
    </Wrapper>
  )
}
export default Staking

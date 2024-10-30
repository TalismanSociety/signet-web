import { useMemo, useState } from 'react'
import { BondedPool, selectedPoolIdAtom } from '@domains/nomination-pools'
import { useNomPoolsOf } from '@domains/staking/useNomPoolsOf'
import { Button, Identicon, Skeleton } from '@talismn/ui'
import { Chain, useNativeToken } from '@domains/chains'
import { formatUnits } from '@util/numbers'
import { useApi } from '@domains/chains/pjs-api'
import { Nomination, useNominations } from '@domains/staking/useNominations'
import { Address } from '@util/addresses'
import { SettingsInfoRow } from '../Settings/InfoRow'
import { u8aToString, u8aUnwrapBytes } from '@polkadot/util'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@components/ui/dropdown-menu'
import { useRecoilState } from 'recoil'

const Text: React.FC<React.PropsWithChildren<{ loading?: boolean }>> = ({ children, loading }) =>
  loading ? (
    <Skeleton.Surface css={{ height: 22.4, width: 80 }} />
  ) : (
    <p css={({ color }) => ({ color: color.offWhite, fontSize: 16 })}>{children}</p>
  )

const isManager = (pool: BondedPool, address: Address): boolean => {
  return pool.roles.root.isEqual(address) || pool.roles.nominator.isEqual(address)
}

const NominationPoolDetails: React.FC<{ pool: BondedPool; chain?: Chain }> = ({ chain, pool }) => (
  <div className="flex items-center gap-[8px] w-full">
    <Identicon size={32} className="min-w-[32px]" value={pool.stash.toSs58(chain)} />
    <div className="w-full overflow-hidden [&>p]:text-[14px]">
      <p className="text-[14px] font-semibold text-offWhite">Pool #{pool.id}</p>
      <p className="w-full whitespace-nowrap overflow-hidden text-ellipsis">
        {pool.metadata ? u8aToString(u8aUnwrapBytes(pool.metadata)) : pool.stash.toShortSs58(chain)}
      </p>
    </div>
  </div>
)

const NominationPoolOverview: React.FC<{
  address: Address
  chain: Chain
  onEdit: (bondedPool: BondedPool, nominations: Nomination[]) => void
}> = ({ address, chain, onEdit }) => {
  const { api } = useApi(chain.genesisHash)
  const { nativeToken } = useNativeToken(chain.nativeToken.id)

  const nomPools = useNomPoolsOf(address, chain)
  const [selectedPoolId, setSelectedPoolId] = useRecoilState(selectedPoolIdAtom)
  const [openPoolsDropdown, setOpenPoolsDropdown] = useState(false)
  const nomPool = useMemo(
    () => nomPools?.find(p => p.id === selectedPoolId) ?? nomPools?.[0],
    [nomPools, selectedPoolId]
  )
  const { nominations, isReady } = useNominations(chain, nomPool?.stash.toSs58(chain))

  const nomPoolPalletSupported = api ? Boolean(api.query?.nominationPools) : undefined
  const loading = nomPoolPalletSupported === undefined || !nomPool || !nativeToken

  const statementUI = useMemo(() => {
    if (api && !api.query.nominationPools)
      return <p className="text-[14px]">Nomination Pool pallet not supported on this network.</p>
    if (!api || nomPool === undefined) return <Skeleton.Surface css={{ height: 22.9, width: 120 }} />
    if (nomPool === null || !isManager(nomPool, address))
      return <p className="text-[14px]">This multisig does not control any nomination pool.</p>

    return <p className="text-[14px]">This multisig can nominate on behalf of the Nomination Pool</p>
  }, [address, api, nomPool])

  return (
    <div className="grid grid-cols-2 gap-[32px] w-full">
      <div className="w-full">
        <h2 css={({ color }) => ({ color: color.offWhite, fontSize: 20 })}>Nomination Pool</h2>
        {statementUI}
        {!!nomPool && (
          <>
            <DropdownMenu open={openPoolsDropdown} onOpenChange={setOpenPoolsDropdown}>
              <DropdownMenuTrigger className="bg-gray-900 border-none w-full text-left px-[12px] py-[8px] flex flex-1 items-center gap-[8px] rounded-[12px] relative my-[24px] hover:bg-gray-800">
                <NominationPoolDetails pool={nomPool} chain={chain} />
              </DropdownMenuTrigger>
              {nomPools && nomPools.length > 1 && (
                <DropdownMenuContent align="start">
                  {nomPools.map(pool => (
                    <div
                      key={pool.id}
                      className="hover:bg-gray-800 p-[8px] rounded-[8px] cursor-pointer"
                      onClick={() => {
                        setOpenPoolsDropdown(false)
                        setSelectedPoolId(pool.id)
                      }}
                    >
                      <NominationPoolDetails pool={pool} chain={chain} />
                    </div>
                  ))}
                </DropdownMenuContent>
              )}
            </DropdownMenu>

            <div>
              {nominations === undefined ? (
                <Skeleton.Surface css={{ height: 20, width: 120 }} />
              ) : nominations.length === 0 ? (
                <p>No validators nominated.</p>
              ) : (
                <p>
                  <span css={({ color }) => ({ color: color.offWhite })}>{nominations.length} validators</span>{' '}
                  nominated.
                </p>
              )}
              {isManager(nomPool, address) && (
                <Button
                  css={{ marginTop: 16, fontSize: 14, padding: '8px 16px' }}
                  disabled={!isReady}
                  loading={!isReady}
                  onClick={() => {
                    if (nominations) onEdit(nomPool, nominations)
                  }}
                >
                  Nominate Validators
                </Button>
              )}
            </div>
          </>
        )}
      </div>
      {nomPool === null ? null : (
        <div css={{ display: 'flex', gap: 24, flexDirection: 'column', width: '100%' }}>
          <SettingsInfoRow label="Total Bonded Amount">
            <Text loading={loading}>
              {nomPool && nativeToken
                ? `${(+formatUnits(nomPool.points, nativeToken?.decimals)).toLocaleString()} ${nativeToken.symbol}`
                : ''}
            </Text>
          </SettingsInfoRow>
          <SettingsInfoRow label="Members">
            <Text loading={loading}>{nomPool?.memberCounter.toLocaleString()}</Text>
          </SettingsInfoRow>
          <SettingsInfoRow label="State">
            <Text loading={loading}>{nomPool?.state}</Text>
          </SettingsInfoRow>
        </div>
      )}
    </div>
  )
}

export default NominationPoolOverview

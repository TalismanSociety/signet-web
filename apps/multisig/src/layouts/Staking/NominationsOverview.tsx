import { useMemo, useState } from 'react'
import { BondedPool, selectedPoolIdAtom } from '@domains/nomination-pools'
import { useNomPoolsOf } from '@domains/staking/useNomPoolsOf'
import { Button, CircularProgressIndicator, Identicon, Skeleton } from '@talismn/ui'
import { Chain } from '@domains/chains'
import { useApi } from '@domains/chains/pjs-api'
import { useNominations } from '@domains/staking/useNominations'
import { Address } from '@util/addresses'
import { u8aToString, u8aUnwrapBytes } from '@polkadot/util'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@components/ui/dropdown-menu'
import { useRecoilState } from 'recoil'
import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { NomPoolStats } from './NomPoolStats'
import { ChevronDown, ChevronUp } from '@talismn/icons'
import { useSelectedMultisig } from '@domains/multisig'

const isManager = (pool: BondedPool, address: Address): boolean => {
  return pool.roles.root.isEqual(address) || pool.roles.nominator.isEqual(address)
}

const NominationPoolDetails: React.FC<{ pool: BondedPool; chain?: Chain }> = ({ chain, pool }) => (
  <div className="flex items-center gap-[8px] w-full">
    <Identicon size={32} className="min-w-[32px]" value={pool.stash.toSs58(chain)} />
    <div className="w-full overflow-hidden">
      <p className="text-[16px] text-offWhite">Pool #{pool.id}</p>
      <p className="w-full whitespace-nowrap text-[12px] overflow-hidden text-ellipsis">
        {pool.metadata ? u8aToString(u8aUnwrapBytes(pool.metadata)) : pool.stash.toShortSs58(chain)}
      </p>
    </div>
  </div>
)

/**
 * A component that allows managing nominations as individual or as a nomination pool controller.
 */
const NominationsOverview: React.FC<{
  chain: Chain
  onEdit: (bondedPool?: BondedPool) => void
}> = ({ chain, onEdit }) => {
  const [multisig] = useSelectedMultisig()
  const { api } = useApi(chain.genesisHash)

  const nomPools = useNomPoolsOf(multisig.proxyAddress, chain)
  const [selectedPoolId, setSelectedPoolId] = useRecoilState(selectedPoolIdAtom)
  const [openPoolsDropdown, setOpenPoolsDropdown] = useState(false)
  const nomPool = useMemo(() => nomPools?.find(p => p.id === selectedPoolId), [nomPools, selectedPoolId])
  const { nominations, isReady } = useNominations(
    chain,
    nomPool?.stash.toSs58(chain) ?? multisig.proxyAddress.toSs58(chain)
  )

  const stakingPalletSupported = useMemo(
    () => api && Boolean(api.query.staking) && Boolean(api.tx.staking.nominate),
    [api]
  )
  const nomPoolPalletSupported = useMemo(() => (api ? Boolean(api.query?.nominationPools) : undefined), [api])

  const statementUI = useMemo(() => {
    if (!api) return <Skeleton.Surface className="h-[24px] w-[120px]" />
    if (!nomPoolPalletSupported) return <p className="text-[14px]">Nomination pool is not supported on this network.</p>
    if (nomPools && nomPools.length > 0)
      return (
        <p className="text-[14px]">
          This multisig controls <span className="text-offWhite">{nomPools.length} Nomination Pool</span>
        </p>
      )
    return <p className="text-[14px]">Nominate validators to earn staking rewards.</p>
  }, [api, nomPoolPalletSupported, nomPools])

  if (stakingPalletSupported === undefined)
    return (
      <div className="mt-[24px] flex items-center justify-center">
        <CircularProgressIndicator size={32} />
      </div>
    )

  if (!stakingPalletSupported)
    return (
      <div>
        <p className="text-center">Staking not supported on this network.</p>
      </div>
    )

  return (
    <div className="w-full">
      {statementUI}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[32px] w-full mt-[16px]">
        <div className="w-full">
          <DropdownMenu open={openPoolsDropdown} onOpenChange={setOpenPoolsDropdown}>
            <DropdownMenuTrigger className="bg-gray-900 border-none w-full text-left px-[12px] py-[8px] flex flex-1 items-center gap-[8px] rounded-[12px] relative mb-[24px] hover:bg-gray-800">
              {nomPool ? (
                <NominationPoolDetails pool={nomPool} chain={chain} />
              ) : (
                <AccountDetails
                  identiconSize={32}
                  address={multisig.proxyAddress}
                  name={multisig.name}
                  chain={chain}
                  breakLine
                  disableCopy
                />
              )}
              {openPoolsDropdown ? (
                <ChevronUp size={20} className="min-w-[20px]" />
              ) : (
                <ChevronDown size={20} className="min-w-[20px]" />
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-[var(--radix-popper-anchor-width)]">
              <div
                className="hover:bg-gray-800 p-[8px] rounded-[8px] cursor-pointer"
                onClick={() => {
                  setOpenPoolsDropdown(false)
                  setSelectedPoolId(undefined)
                }}
              >
                <AccountDetails
                  identiconSize={32}
                  disableCopy
                  address={multisig.proxyAddress}
                  name={multisig.name}
                  breakLine
                />
              </div>
              {nomPools?.map(pool => (
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
          </DropdownMenu>

          <div>
            {nominations === undefined ? (
              <Skeleton.Surface css={{ height: 20, width: 120 }} />
            ) : nominations.length === 0 ? (
              <p>No validators nominated.</p>
            ) : (
              <p>
                <span css={({ color }) => ({ color: color.offWhite })}>{nominations.length} validators</span> nominated.
              </p>
            )}
            {(!nomPool || (nomPool && isManager(nomPool, multisig.proxyAddress))) && (
              <Button
                css={{ marginTop: 16, fontSize: 14, padding: '8px 16px' }}
                disabled={!isReady}
                loading={!isReady}
                onClick={() => {
                  if (isReady) onEdit(nomPool)
                }}
              >
                Nominate Validators
              </Button>
            )}
          </div>
        </div>

        {nomPool && <NomPoolStats pool={nomPool} chain={chain} />}
      </div>
    </div>
  )
}

export default NominationsOverview

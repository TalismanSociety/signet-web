import { useMemo } from 'react'
import { Identicon, Skeleton } from '@talismn/ui'
import AddressTooltip from '@components/AddressTooltip'
import { Transaction } from '@domains/offchain-data/metadata/types'
import { useNomPoolsOf } from '@domains/staking/useNomPoolsOf'
import { useNominations } from '@domains/staking/useNominations'
import { useValidators, ValidatorWithIdentity } from '@domains/staking'
import { Multisig } from '@domains/multisig'
import { ValidatorDetails } from './ValidatorDetails'

const useNominationsDiff = ({
  multisig,
  poolId,
  proposedValidatorsAddresses,
}: {
  multisig: Multisig
  poolId?: number
  proposedValidatorsAddresses: string[]
}) => {
  const pools = useNomPoolsOf(multisig.proxyAddress, multisig.chain)
  const pool = useMemo(() => pools?.find(p => p.id === poolId), [pools, poolId])
  const { validators, loading } = useValidators(multisig.chain.genesisHash)
  const { nominations } = useNominations(
    multisig.chain,
    pool?.stash.toSs58(multisig.chain) ?? multisig.proxyAddress.toSs58(multisig.chain)
  )

  const nominatedValidators = useMemo(() => {
    return validators && nominations
      ? (nominations.map(n => validators[n.toSs58()]).filter(v => !!v) as ValidatorWithIdentity[])
      : []
  }, [nominations, validators])

  const proposedValidators = useMemo(() => {
    return validators
      ? (proposedValidatorsAddresses.map(v => validators[v]).filter(v => !!v) as ValidatorWithIdentity[])
      : []
  }, [proposedValidatorsAddresses, validators])

  const addedNominations = useMemo(
    () => proposedValidators.filter(v => !nominatedValidators?.some(n => n.address.isEqual(v.address))),
    [nominatedValidators, proposedValidators]
  )

  const removedNominations = useMemo(
    () => nominatedValidators.filter(v => !proposedValidators.some(p => p.address.isEqual(v.address))),
    [nominatedValidators, proposedValidators]
  )

  const changed = useMemo(
    () => addedNominations.length > 0 || removedNominations.length > 0,
    [addedNominations, removedNominations]
  )

  return useMemo(
    () => ({ nominatedValidators, proposedValidators, addedNominations, removedNominations, changed, loading }),
    [nominatedValidators, proposedValidators, addedNominations, removedNominations, changed, loading]
  )
}

export const ValidatorsRotationHeader: React.FC<{ t: Transaction }> = ({ t }) => {
  const pools = useNomPoolsOf(t.multisig.proxyAddress, t.multisig.chain)
  const pool = useMemo(
    () => (t.decoded?.nominate?.poolId ? pools?.find(p => p.id === t.decoded?.nominate?.poolId) : null),
    [pools, t.decoded?.nominate?.poolId]
  )
  const { addedNominations, changed, removedNominations } = useNominationsDiff({
    multisig: t.multisig,
    poolId: t.decoded?.nominate?.poolId,
    proposedValidatorsAddresses: t.decoded?.nominate?.validators ?? [],
  })

  return (
    <div className="flex items-center gap-[8px]">
      {pool === null ? null : pool === undefined ? (
        <Skeleton.Surface className="h-[21px] w-[100px]" />
      ) : (
        <AddressTooltip address={pool.stash} name={`Pool #${pool.id} (Stash)`} chain={t.multisig.chain}>
          <div className="flex items-center bg-gray-500 gap-[4px] px-[8px] rounded-[8px]">
            <Identicon size={14} value={pool.stash.toSs58()} />
            <p className="text-offWhite text-[14px] mt-[2px]">Pool #{pool.id}</p>
          </div>
        </AddressTooltip>
      )}
      <p>
        {addedNominations.length > 0 && !t.executedAt && (
          <span className="text-green-500">+ {addedNominations.length}</span>
        )}{' '}
        {removedNominations.length > 0 && !t.executedAt && (
          <span className="text-red-400">- {removedNominations.length}</span>
        )}{' '}
        {changed && <span>Validators</span>}
      </p>
    </div>
  )
}

export const ValidatorsRotationExpandedDetails: React.FC<{ t: Transaction }> = ({ t }) => {
  const { addedNominations, changed, proposedValidators, nominatedValidators, removedNominations, loading } =
    useNominationsDiff({
      multisig: t.multisig,
      poolId: t.decoded?.nominate?.poolId,
      proposedValidatorsAddresses: t.decoded?.nominate?.validators ?? [],
    })

  return (
    <div className="grid gap-[16px]">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-gray-200 text-[16px]">{changed && !t.executedAt && 'New '}Nominated Validators</p>
          <div className="text-primary bg-primary/20 text-[14px] py-[4px] px-[8px] rounded-[6px]">
            {proposedValidators.length} Validators
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-[8px] mt-[8px]">
          {loading && (
            <>
              <Skeleton.Surface className="h-[46px] w-[100%]" />
              <Skeleton.Surface className="h-[46px] w-[100%]" />
              <Skeleton.Surface className="h-[46px] w-[100%]" />
              <Skeleton.Surface className="h-[46px] w-[100%]" />
              <Skeleton.Surface className="h-[46px] w-[100%]" />
              <Skeleton.Surface className="h-[46px] w-[100%]" />
              <Skeleton.Surface className="h-[46px] w-[100%]" />
              <Skeleton.Surface className="h-[46px] w-[100%]" />
            </>
          )}
          {proposedValidators.map(validator => (
            <div key={validator.address.toSs58()} className="bg-gray-800 px-[8px] pt-[6px] py-[4px] rounded-[8px]">
              <ValidatorDetails validator={validator} chain={t.multisig.chain} />
            </div>
          ))}
        </div>
      </div>
      {nominatedValidators.length > 0 && !t.executedAt && addedNominations.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-gray-200 text-[16px]">Added Validators</p>
            <div className="text-green-500 bg-green-400/20 text-[14px] py-[4px] px-[8px] rounded-[6px]">
              {addedNominations.length} Added
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-[8px] mt-[8px]">
            {addedNominations.map(validator => (
              <div key={validator.address.toSs58()} className="bg-gray-800 px-[8px] pt-[6px] py-[4px] rounded-[8px]">
                <ValidatorDetails validator={validator} chain={t.multisig.chain} />
              </div>
            ))}
          </div>
        </div>
      )}
      {nominatedValidators.length > 0 && !t.executedAt && removedNominations.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-gray-200 text-[16px]">Removed Validators</p>
            <div className="text-red-500 bg-red-400/20 text-[14px] py-[4px] px-[8px] rounded-[6px]">
              {removedNominations.length} Removed
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-[8px] mt-[8px]">
            {removedNominations.map(validator => (
              <div key={validator.address.toSs58()} className="bg-gray-800 px-[8px] pt-[6px] py-[4px] rounded-[8px]">
                <ValidatorDetails validator={validator} chain={t.multisig.chain} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

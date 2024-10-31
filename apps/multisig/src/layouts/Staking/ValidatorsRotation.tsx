import { Identicon } from '@talismn/ui'
import { Button } from '@components/ui/button'
import { Address } from '@util/addresses'
import { useNominations } from '@domains/staking/useNominations'
import { ChevronLeft, Trash2, X } from '@talismn/icons'
import { useSelectedMultisig } from '@domains/multisig'
import { useCallback, useMemo, useState } from 'react'
import { useConsts } from '@domains/chains/ConstsWatcher'
import { useToast } from '@components/ui/use-toast'
import { useNominateTransaction } from '../../domains/staking/useNominateTransaction'
import { TransactionSidesheet } from '@components/TransactionSidesheet'
import { u8aToString, u8aUnwrapBytes } from '@polkadot/util'
import { BondedPool } from '@domains/nomination-pools'
import { PageTabs, PageTabsContent, PageTabsList, PageTabsTrigger } from '@components/ui/page-tabs'
import { cn } from '@util/tailwindcss'
import { SelectValidatorsDialog } from './SelectValidatorsDialog'
import { useValidators, ValidatorWithIdentity } from '@domains/staking'
import { Chain } from '@domains/chains'
import { ValidatorDetails } from './ValidatorDetails'

const CounterBadge: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div
    className={cn(
      'rounded-[6px] px-[6px] h-[18px] text-[12px] text-center flex items-center justify-center bg-primary/20 text-primary',
      className
    )}
  >
    <span className="mt-[2px]">{children}</span>
  </div>
)

export const ChangeList: React.FC<{
  badge?: React.ReactNode
  chain: Chain
  validators: ValidatorWithIdentity[]
  title: string
  emptyMessage: string
  onClear?: () => void
  onClickValidator: (validator: ValidatorWithIdentity) => void
}> = ({ badge, chain, emptyMessage, onClear, onClickValidator, title, validators }) => (
  <div className="w-full">
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-[4px]">
        <p className="font-bold text-[14px]">{title}</p>
        {badge}
      </div>
      {validators.length > 0 && onClear && (
        <Button size="sm" variant="outline" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
    <div className="flex flex-col gap-[4px] mt-[8px] p-[4px] bg-gray-900 rounded-[16px] max-h-[320px] overflow-y-auto">
      {validators.length === 0 ? (
        <div className="flex items-center justify-center p-[8px]">
          <p className="text-[14px]">{emptyMessage}</p>
        </div>
      ) : (
        validators.map(validator => (
          <div
            key={validator.address.toSs58()}
            className="bg-gray-800 hover:bg-gray-700 min-h-max group cursor-pointer rounded-[8px] px-[12px] py-[8px] flex items-center justify-between overflow-hidden"
            onClick={() => onClickValidator(validator)}
          >
            <ValidatorDetails validator={validator} chain={chain} />
            <X className="group-hover:text-offWhite" size={16} />
          </div>
        ))
      )}
    </div>
  </div>
)

export const ValidatorsRotation: React.FC<{
  address: Address
  pool?: BondedPool
  onBack: () => void
}> = ({ address, onBack, pool }) => {
  const { toast } = useToast()
  const [multisig] = useSelectedMultisig()
  const description = useMemo(() => `Nominate Validators${pool ? ` for Pool #${pool.id}` : ''}`, [pool])
  const [reviewing, setReviewing] = useState(false)
  const [added, setAdded] = useState<string[]>([])
  const [removed, setRemoved] = useState<string[]>([])
  const [tab, setTab] = useState<'current' | 'new'>('current')
  const isDirty = useMemo(() => removed.length > 0 || added.length > 0, [added, removed])

  const { nominations } = useNominations(
    multisig.chain,
    pool?.stash.toSs58(multisig.chain) ?? multisig.proxyAddress.toSs58(multisig.chain)
  )

  const { consts } = useConsts(multisig.chain)
  const { validators } = useValidators(multisig.chain.genesisHash)

  const nominatedValidators = useMemo(
    () =>
      validators && nominations ? nominations.map(n => validators[n.toSs58()]!).filter(validator => !!validator) : [],
    [nominations, validators]
  )

  const removedValidators = useMemo(
    () => (validators ? removed.map(a => validators[a]!).filter(validator => !!validator) : []),
    [removed, validators]
  )

  const addedValidators = useMemo(() => {
    if (!validators) return []
    return added.map(address => validators[address]!).filter(validator => !!validator)
  }, [added, validators])

  const newNominations = useMemo(
    // filter out all included in removed, then concat with all in added
    () =>
      validators && nominations
        ? [...nominations.map(n => n.toSs58()).filter(a => !removed.includes(a)), ...added].map(a => validators[a]!)
        : [],
    [added, nominations, removed, validators]
  )

  const handleSelectValidator = useCallback(
    (_address: Address) => {
      const address = _address.toSs58()
      const isCurrentlySelected = nominations?.some(n => n.toSs58() === address)
      const isDeleted = removed.includes(address)
      const isAdded = added.includes(address)

      if (isCurrentlySelected) {
        setRemoved(prev => (isDeleted ? prev.filter(addr => addr !== address) : [...prev, address]))
      } else {
        setAdded(prev => (isAdded ? prev.filter(addr => addr !== address) : [...prev, address]))
      }
    },
    [added, nominations, removed]
  )

  const { extrinsic } = useNominateTransaction(
    address,
    description,
    newNominations.map(n => n?.address.toSs58()),
    pool
  )

  const handleReset = useCallback(() => {
    setAdded([])
    setRemoved([])
  }, [])

  return (
    <>
      <div className="w-full">
        <Button className="h-[32px] min-h-[32px] w-max !p-[8px]" variant="secondary" onClick={onBack}>
          <div className="flex items-center gap-[4px]">
            <ChevronLeft size={16} />
            <span className="text-gray-200 mt-[2px] text-[14px]">Back</span>
          </div>
        </Button>
        <h2 className="text-offWhite mt-[12px] font-bold">Nominate Validators</h2>
        <p className="text-[14px] mt-[4px]">
          You are nominating from <span className="text-offWhite">{pool ? 'a pool' : 'the proxied address'}</span> your
          Multisig controls
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px] w-full">
        <div className="bg-gray-900 px-[12px] h-max py-[8px] pt-[10px] rounded-[12px] flex items-center gap-[8px] w-full overflow-hidden">
          <Identicon size={32} className="min-w-[32px]" value={address.toSs58(multisig.chain)} />
          <div className="w-full overflow-hidden">
            <p className="text-offWhite">{pool ? `Pool #${pool.id}` : multisig.name}</p>
            <p className="text-[14px] truncate">
              {pool
                ? pool.metadata
                  ? u8aToString(u8aUnwrapBytes(pool.metadata))
                  : address.toShortSs58(multisig.chain)
                : multisig.proxyAddress.toShortSs58(multisig.chain)}
            </p>
          </div>
        </div>
      </div>

      <PageTabs defaultValue="current" value={tab} onValueChange={v => setTab(v as 'current' | 'new')}>
        <div className="flex items-end justify-between gap-[12px] h-max mb-[8px] px-[8px]">
          <PageTabsList className="mb-0">
            <PageTabsTrigger value="current" className="flex items-center gap-[4px]">
              <p className="font-bold text-[16px]">Current</p>
              {nominations && nominations.length > 0 && <CounterBadge>{nominations.length}</CounterBadge>}
            </PageTabsTrigger>
            <PageTabsTrigger value="new" className="flex items-center gap-[4px]">
              <p className="font-bold text-[16px]">New</p>
              {addedValidators.length > 0 && (
                <CounterBadge className="text-green-500 bg-green-500/20">+{addedValidators.length}</CounterBadge>
              )}
              {removedValidators.length > 0 && (
                <CounterBadge className="text-red-500 bg-red-500/20">-{removedValidators.length}</CounterBadge>
              )}
            </PageTabsTrigger>
          </PageTabsList>

          <SelectValidatorsDialog
            chain={multisig.chain}
            onClickValidator={a => {
              handleSelectValidator(a)
              setTab('new')
            }}
            validators={{
              current: nominations?.map(n => n.toSs58()) ?? [],
              added,
              removed,
            }}
          >
            <Button size="lg">Add Validator</Button>
          </SelectValidatorsDialog>
        </div>
        <div className="bg-gray-900 rounded-[16px] p-[8px] min-h-[69px]">
          <PageTabsContent value="current">
            {nominatedValidators.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-[8px]">
                {nominatedValidators.map(validator => (
                  <div
                    key={validator.address.toSs58()}
                    className="bg-gray-800 hover:bg-gray-700 group cursor-pointer rounded-[8px] px-[12px] py-[8px] flex items-center justify-between overflow-hidden"
                    onClick={() => handleSelectValidator(validator.address)}
                  >
                    <ValidatorDetails validator={validator} chain={multisig.chain} />
                    <Trash2
                      className={
                        removed.includes(validator.address.toSs58()) ? 'opacity-40' : 'group-hover:text-offWhite'
                      }
                      size={16}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[53px]">
                <p className="text-[14px]">No nominations yet.</p>
              </div>
            )}
          </PageTabsContent>
          <PageTabsContent value="new">
            {newNominations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-[8px]">
                {newNominations.map(validator => (
                  <div
                    key={validator.address.toSs58()}
                    className={cn(
                      'hover:bg-gray-700 group cursor-pointer rounded-[8px] px-[12px] py-[8px] flex items-center justify-between overflow-hidden',
                      added.includes(validator.address.toSs58())
                        ? 'bg-green-500/10 hover:bg-green-500/20'
                        : 'bg-gray-800 hover:bg-gray-700'
                    )}
                    onClick={() => handleSelectValidator(validator.address)}
                  >
                    <ValidatorDetails validator={validator} chain={multisig.chain} />
                    {added.includes(validator.address.toSs58()) ? (
                      <X className="group-hover:text-offWhite" size={16} />
                    ) : (
                      <Trash2 className="group-hover:text-offWhite" size={16} />
                    )}
                  </div>
                ))}
              </div>
            ) : isDirty ? (
              <div className="flex items-center justify-center min-h-[53px]">
                <p className="text-[14px]">
                  Removed all validators.{' '}
                  <span className="text-offWhite cursor-pointer hover:text-gray-200" onClick={() => setRemoved([])}>
                    Undo
                  </span>
                </p>
              </div>
            ) : null}
            {isDirty ? null : (
              <div className="flex items-center justify-center min-h-[53px]">
                <p className="text-[14px]">No changes yet.</p>
              </div>
            )}
          </PageTabsContent>
        </div>
      </PageTabs>

      <div className="flex gap-[32px] mt-[16px]">
        <ChangeList
          chain={multisig.chain}
          emptyMessage="No validator added."
          onClear={() => setAdded([])}
          onClickValidator={validator => setAdded(added.filter(a => a !== validator.address.toSs58()))}
          title="Added Validators"
          validators={addedValidators}
          badge={
            addedValidators.length > 0 ? (
              <CounterBadge className="text-green-500 bg-green-500/20">+{addedValidators.length}</CounterBadge>
            ) : null
          }
        />

        <ChangeList
          chain={multisig.chain}
          emptyMessage="No validator removed."
          onClear={() => setRemoved([])}
          onClickValidator={validator => setRemoved(prev => prev.filter(a => a !== validator.address.toSs58()))}
          title="Removed Validators"
          validators={removedValidators}
          badge={
            removedValidators.length > 0 ? (
              <CounterBadge className="text-red-500 bg-red-500/20">-{removedValidators.length}</CounterBadge>
            ) : null
          }
        />
      </div>

      <div css={{ display: 'flex', gap: 24 }}>
        <Button disabled={!isDirty} variant="outline" onClick={handleReset}>
          Reset
        </Button>
        <Button
          disabled={!isDirty || !consts || newNominations.length > consts.maxNominations}
          onClick={() => setReviewing(true)}
        >
          Review
        </Button>
      </div>
      {extrinsic && (
        <TransactionSidesheet
          calldata={extrinsic.method.toHex()}
          description={description}
          open={reviewing}
          onApproveFailed={e => {
            setReviewing(false)
            console.error(e)
            toast({
              title: 'Failed to approve transaction',
              description: e.message,
            })
          }}
          onClose={() => setReviewing(false)}
        />
      )}
    </>
  )
}

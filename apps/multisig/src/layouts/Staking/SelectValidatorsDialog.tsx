import { Dialog, DialogContent, DialogTrigger } from '@components/ui/dialog'
import { Input } from '@components/ui/input'
import { Chain } from '@domains/chains'
import { useValidators, ValidatorWithIdentity } from '@domains/staking'
import { CircularProgressIndicator, Skeleton } from '@talismn/ui'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Address } from '@util/addresses'
import { CheckIcon } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { ValidatorDetails } from './ValidatorDetails'

type ValidatorsDiff = {
  current: string[]
  added: string[]
  removed: string[]
}
type Props = {
  chain: Chain
  validators: ValidatorsDiff
  onClickValidator: (validatorAddress: Address) => void
}

const VirtualizedList: React.FC<{
  chain: Chain
  validators: [string, ValidatorWithIdentity][]
  onClickValidator: (address: Address) => void
  isSelected: (address: Address) => boolean
}> = ({ chain, isSelected, onClickValidator, validators }) => {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    getScrollElement: () => wrapperRef.current,
    count: validators.length,
    estimateSize: () => 64,
  })

  return (
    <div className="max-h-[400px] h-full overflow-y-auto" ref={wrapperRef}>
      <div className="w-full relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => {
          const data = validators[virtualRow.index]
          if (!data) return null
          const [address, validator] = data
          return (
            <div
              key={address}
              className="flex absolute top-0 left-0 items-center h-[56px] gap-[8px] w-full p-[8px] bg-gray-800 hover:bg-gray-700 cursor-pointer rounded-[12px]"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
              onClick={() => onClickValidator(validator.address)}
            >
              <ValidatorDetails chain={chain} validator={validator} disableTooltip />
              {isSelected(validator.address) ? (
                <CheckIcon size={16} className="text-primary min-w-[16px] h-[16px]" />
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const SelectValidatorsDialog: React.FC<React.PropsWithChildren<Props>> = ({
  chain,
  children,
  validators,
  onClickValidator,
}) => {
  const [query, setQuery] = useState('')
  const { validators: allValidators, identityLoading } = useValidators(chain.genesisHash)
  const [open, setOpen] = useState(false)

  const filteredValidators = useMemo(() => {
    if (!allValidators) return []
    return Object.entries(allValidators).filter(([_, validator]) => {
      return (
        validator.address.toSs58().toLowerCase().includes(query.toLowerCase()) ||
        validator.address.toSs58(chain).toLowerCase().includes(query.toLowerCase()) ||
        (validator.name && validator.name.toLowerCase().includes(query.toLowerCase())) ||
        (validator.subName && validator.subName.toLowerCase().includes(query.toLowerCase())) ||
        (validator.name &&
          validator.subName &&
          `${validator.name} / ${validator.subName}`.toLowerCase().includes(query.toLowerCase()))
      )
    })
  }, [allValidators, query, chain])

  const isSelected = useCallback(
    (_address: Address) => {
      const address = _address.toSs58()
      const isCurrentlySelected = validators.current.includes(address)
      const isDeleted = validators.removed.includes(address)
      const isAdded = validators.added.includes(address)
      if (isCurrentlySelected) return !isDeleted
      return isAdded
    },
    [validators]
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent>
        <p className="font-bold text-offWhite">Select Validators</p>
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by address or name..."
          className="p-[8px] px-[12px] h-max min-h-max"
        />

        <div className="flex items-center justify-between">
          {!allValidators ? (
            <Skeleton.Surface />
          ) : (
            <p className="text-[14px]">Found {filteredValidators.length.toLocaleString()} validators</p>
          )}
          {identityLoading ? (
            <div className="flex items-center gap-[4px]">
              <CircularProgressIndicator size={16} />
              <p className="text-[14px]">Loading identities...</p>
            </div>
          ) : null}
        </div>

        {!allValidators ? (
          <div className="flex flex-col gap-[8px]">
            <Skeleton.Surface className="w-full h-[56px]" />
            <Skeleton.Surface className="w-full h-[56px]" />
            <Skeleton.Surface className="w-full h-[56px]" />
            <Skeleton.Surface className="w-full h-[56px]" />
          </div>
        ) : (
          <VirtualizedList
            validators={filteredValidators}
            chain={chain}
            isSelected={isSelected}
            onClickValidator={onClickValidator}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

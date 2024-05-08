import { TableCell, TableRow } from '@components/ui/table'
import { AddressInputCell } from './AddressInputCell'
import { Switch } from '@components/ui/switch'
import { MultisendSend, MultisendTableKeyDownHandler, MultisendTableRefHandler } from './MultisendTable'
import { AddressWithName } from '@components/AddressInput'
import { MultisendTableBlockInput } from './MultisendTableBlockInput'
import { AmountUnit } from '@components/AmountUnitSelector'
import { parseUnits } from '@util/numbers'
import { useMemo } from 'react'
import { Tooltip } from '@components/ui/tooltip'
import { cn } from '@util/tailwindcss'
import { useRecoilValue } from 'recoil'
import { multisendAmountUnitAtom, multisendTokenAtom } from './atom'
import { validateMultisendRow } from './utils'
import { Address } from '@util/addresses'

type Props = {
  index: number
  handleRef: MultisendTableRefHandler
  handleKeyDown: MultisendTableKeyDownHandler
  contacts?: AddressWithName[]
  canVest?: boolean
  send: MultisendSend
  onSendsChange?: (send: MultisendSend[]) => void

  // details for vesting
  currentBlock?: number
  blockTime?: number
  disableVesting: boolean
  hideVesting: boolean
}

/* try to find an address and amount from given string and perform required formatting */
const findAddressAndAmount = (
  row: string
): {
  data?: { address: Address; addressString: string; amount: string; start?: number; end?: number }
  error?: string
} => {
  // try format "address, amount"
  let [address, amount, startBlock, endBlock] = row.split(',')

  // try format "address amount"
  if (!address || !amount) {
    ;[address, amount, startBlock, endBlock] = row.split(' ')
  }

  // try format "address  amount"
  if (!address || !amount) {
    ;[address, amount, startBlock, endBlock] = row.split('  ')
  }

  // try format "address[tab]amount", common for imported CSV
  if (!address || !amount) {
    ;[address, amount, startBlock, endBlock] = row.split('\t')
  }

  // try format "address=amount", common for imported CSV
  if (!address || !amount) {
    ;[address, amount, startBlock, endBlock] = row.split('=')
  }

  if (!address && !amount) return { error: 'Empty' }
  if (!address || !amount) return { error: 'Invalid Row' }

  const trimmedAddress = address.trim()
  const trimmedAmount = amount.trim()

  const parsedAddress = Address.fromSs58(trimmedAddress)
  const invalidAmount = trimmedAmount === '' || isNaN(+trimmedAmount)
  const start = startBlock ? parseInt(startBlock.trim()) : undefined
  const end = endBlock ? parseInt(endBlock.trim()) : undefined
  if (start !== undefined && isNaN(start)) return { error: 'Invalid Start Block' }
  if (end !== undefined && isNaN(end)) return { error: 'Invalid End Block' }
  if (!parsedAddress && invalidAmount) return { error: 'Invalid Row' }
  if (!parsedAddress) return { error: 'Invalid Address' }
  if (invalidAmount) return { error: 'Invalid Amount' }

  return {
    data: {
      address: parsedAddress,
      addressString: trimmedAddress,
      amount: trimmedAmount,
      start,
      end,
    },
  }
}

export const MultisendTableRow: React.FC<Props> = ({
  blockTime,
  contacts,
  currentBlock,
  handleKeyDown,
  handleRef,
  onSendsChange,
  index,
  canVest,
  disableVesting,
  send,
  hideVesting,
}) => {
  const unit = useRecoilValue(multisendAmountUnitAtom)
  const token = useRecoilValue(multisendTokenAtom)
  const errors = useMemo(() => validateMultisendRow(send, canVest), [canVest, send])
  return (
    <TableRow key={index} className="border-t border-gray-500 relative h-[48px]">
      <TableCell
        className={cn('border-r border-gray-500 w-[180px] px-[8px]', errors?.recipient ? 'bg-red-600/10' : '')}
      >
        <Tooltip content={errors?.recipient}>
          <div className="w-full">
            <AddressInputCell
              contacts={contacts}
              inputRef={ref => handleRef(ref, index, 'recipient')}
              className="bg-transparent w-full text-ellipsis"
              onKeyDown={e => handleKeyDown(e, index, 'recipient')}
              onChangeAddress={address => {
                onSendsChange?.([{ ...send, recipient: address }])
              }}
              address={send.recipient}
              onPaste={e => {
                const pastedText = e.clipboardData.getData('text/plain')
                const lines = pastedText.split('\n')
                const validSends: MultisendSend[] = []
                for (const line of lines) {
                  const send = findAddressAndAmount(line)
                  if (send.error && send.error !== 'Empty') return
                  if (send.data) {
                    validSends.push({
                      recipient: send.data.address,
                      amount: send.data.amount,
                      vested:
                        send.data.start !== undefined && send.data.end !== undefined
                          ? { start: send.data.start, end: send.data.end }
                          : undefined,
                    })
                  }
                }
                e.preventDefault()
                e.currentTarget.blur()
                onSendsChange?.(validSends)
              }}
            />
          </div>
        </Tooltip>
      </TableCell>
      <TableCell className={cn('border-r border-gray-500 w-[140px]', errors?.amount ? 'bg-red-600/10' : '')}>
        <Tooltip content={errors?.amount}>
          <div className="flex items-center gap-[4px]">
            <input
              className="bg-transparent w-full text-ellipsis text-right leading-none pt-[3px] text-[14px]"
              ref={ref => handleRef(ref, index, 'amount')}
              onKeyDown={e => handleKeyDown(e, index, 'amount')}
              disabled={!token}
              value={send.amount ?? ''}
              onChange={e => {
                let amount = e.target.value
                if (amount === '.') amount = '0.'
                try {
                  if (unit === AmountUnit.Token && amount !== '') {
                    // make sure amount can be parsed
                    parseUnits(amount, token?.decimals ?? 18)
                  } else if (Number.isNaN(parseFloat(amount)) && amount !== '') return
                  onSendsChange?.([{ ...send, amount }])
                } catch (e) {}
              }}
            />
            <p className="text-[14px] leading-none font-bold">{unit === AmountUnit.Token ? token?.symbol : 'USD'}</p>
          </div>
        </Tooltip>
      </TableCell>

      {hideVesting ? null : (
        <>
          <TableCell className="w-[60px] border-r border-gray-500">
            {currentBlock === undefined || blockTime === undefined ? (
              <p className="text-[14px] whitespace-nowrap">-</p>
            ) : canVest && !disableVesting ? (
              <div className="flex items-center justify-center">
                <Switch
                  ref={ref => handleRef(ref, index, 'vested')}
                  onKeyDown={e => handleKeyDown(e, index, 'vested')}
                  checked={!!send.vested}
                  onCheckedChange={checked =>
                    onSendsChange?.([{ ...send, vested: checked ? { start: 0, end: 0 } : undefined }])
                  }
                />
              </div>
            ) : (
              <p className="text-[14px] whitespace-nowrap">-</p>
            )}
          </TableCell>
          <TableCell className={cn('w-[120px] border-r border-gray-500', errors?.start ? 'bg-red-600/10' : '')}>
            {canVest && !disableVesting && send.vested ? (
              <Tooltip content={errors?.start}>
                <div className="w-full">
                  <MultisendTableBlockInput
                    blockTime={blockTime}
                    currentBlock={currentBlock}
                    inputRef={ref => handleRef(ref, index, 'start')}
                    onChange={blockNumber =>
                      onSendsChange?.([
                        { ...send, vested: send.vested ? { ...send.vested, start: blockNumber } : undefined },
                      ])
                    }
                    onKeyDown={e => handleKeyDown(e, index, 'start')}
                    value={send.vested.start}
                    minBlock={currentBlock === undefined ? undefined : currentBlock + 1}
                  />
                </div>
              </Tooltip>
            ) : (
              '-'
            )}
          </TableCell>
          <TableCell className={cn('w-[120px]', errors?.end ? 'bg-red-600/10' : '')}>
            {canVest && !disableVesting && send.vested ? (
              <Tooltip content={errors?.end}>
                <div className="w-full">
                  <MultisendTableBlockInput
                    blockTime={blockTime}
                    currentBlock={currentBlock}
                    inputRef={ref => handleRef(ref, index, 'end')}
                    onChange={blockNumber => {
                      onSendsChange?.([
                        { ...send, vested: send.vested ? { ...send.vested, end: blockNumber } : undefined },
                      ])
                    }}
                    onKeyDown={e => handleKeyDown(e, index, 'end')}
                    value={send.vested.end}
                    minBlock={send.vested.start + 1}
                  />
                </div>
              </Tooltip>
            ) : (
              '-'
            )}
          </TableCell>
        </>
      )}
    </TableRow>
  )
}

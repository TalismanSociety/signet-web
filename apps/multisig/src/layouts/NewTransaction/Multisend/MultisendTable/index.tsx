import { Table, TableBody, TableHead, TableHeader, TableRow } from '@components/ui/table'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AddressWithName } from '@components/AddressInput'
import {
  ColumnsInputType,
  MultisendSend,
  MultisendTableKeyDownHandler,
  MultisendTableRefHandler,
  TableColumnKeys,
} from './MultisendTable'
import { MultisendTableRow } from './MultisendTableRow'
import { useLatestBlockNumber } from '@domains/chains/useLatestBlockNumber'
import { useApi } from '@domains/chains/pjs-api'
import { expectedBlockTime } from '@domains/common/substratePolyfills'
import { Button } from '@components/ui/button'
import { Info, PlusIcon, XIcon } from 'lucide-react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { MultisendTableAmountUnitDropdown } from './MultisendTableAmountUnitDropdown'
import { multisendAmountUnitAtom, multisendSendsAtom, multisendTokenAtom } from './atom'
import { AmountUnit } from '@components/AmountUnitSelector'
import { Tooltip } from '@components/ui/tooltip'
import FileUploadButton from '@components/FileUploadButton'
import { Address } from '@util/addresses'
import { useToast } from '@components/ui/use-toast'
import multisendCopyPastaGif from './multisend-copy-pasta.gif'

type Props = {
  contacts?: AddressWithName[]
  chainGenesisHash: string
  disableVesting: boolean
}

const columnsOrder: TableColumnKeys[] = ['recipient', 'amount', 'vested', 'start', 'end']
const findNextColumn = (column: TableColumnKeys): TableColumnKeys => {
  const index = columnsOrder.indexOf(column)
  return columnsOrder[index + 1] ?? columnsOrder[0]!
}

const findPrevColumn = (column: TableColumnKeys): TableColumnKeys => {
  const index = columnsOrder.indexOf(column)
  return columnsOrder[index - 1] ?? columnsOrder[columnsOrder.length - 1]!
}

const isInputKeyboardEvent = (
  el: React.KeyboardEvent<any> | null,
  key: string
): el is React.KeyboardEvent<HTMLInputElement> => {
  return key !== 'vested'
}

export const MultiSendTable: React.FC<Props> = ({ chainGenesisHash, contacts, disableVesting }) => {
  const [lines, setLines] = useState(5)
  const inputRefs = useRef<ColumnsInputType[]>([])
  const lastAddedLine = useRef<number>(4)
  const shouldAutoFocus = useRef<boolean>(false)
  const { api } = useApi(chainGenesisHash)
  const blockNumber = useLatestBlockNumber(chainGenesisHash)
  const [sends, setSends] = useRecoilState(multisendSendsAtom)
  const setAmountUnit = useSetRecoilState(multisendAmountUnitAtom)
  const token = useRecoilValue(multisendTokenAtom)
  const { toast } = useToast()

  const blockTime = useMemo(() => {
    if (!api) return
    return expectedBlockTime(api)
  }, [api])

  const [defaultStartBlock, defaultEndBlock] = useMemo(() => {
    if (blockTime === undefined || blockNumber === undefined) return [0, 0]
    // default to one day from now
    const startBlock = (24 * 60 * 60 * 1000) / blockTime.toNumber() + blockNumber
    // default to one month from default start date
    const endBlock = (30 * 24 * 60 * 60 * 1000) / blockTime.toNumber() + startBlock
    return [startBlock, endBlock]
  }, [blockNumber, blockTime])

  useEffect(() => {
    if (inputRefs.current.length < lines) {
      inputRefs.current = inputRefs.current.concat(
        [...Array(lines - inputRefs.current.length)].map(() => ({
          recipient: null,
          amount: null,
          end: null,
          start: null,
          vested: null,
        }))
      )
    }
  }, [lines])

  // empty the list when user leaves page
  useEffect(() => {
    setSends([])
    setAmountUnit(AmountUnit.Token)
  }, [setAmountUnit, setSends])

  const addLine = useCallback(() => {
    shouldAutoFocus.current = false
    setLines(_lines => _lines + 1)
  }, [])

  const removeLine = useCallback(
    (index: number) => {
      shouldAutoFocus.current = false
      const newInputRefs = [...inputRefs.current]

      newInputRefs.splice(index, 1)
      inputRefs.current = [...newInputRefs]
      lastAddedLine.current = inputRefs.current.length - 1

      setLines(_lines => Math.max(_lines - 1, 1))
      setSends(prev => {
        const newSends = [...prev]
        newSends.splice(index, 1)
        return newSends
      })
    },
    [setSends]
  )

  const handleKeyDown = useCallback<MultisendTableKeyDownHandler>(
    (e, i, column) => {
      if (e.key === 'Enter' && i === inputRefs.current.length - 1) {
        addLine()
        shouldAutoFocus.current = true
      } else if ((e.key === 'ArrowDown' || e.key === 'Enter') && i < inputRefs.current.length - 1) {
        const nextRow = inputRefs.current.findIndex((refs, index) => !!refs[column] && index > i)
        inputRefs.current[nextRow]?.[column]?.focus()
        e.stopPropagation()
      } else if (e.key === 'ArrowUp' && i > 0) {
        // @ts-ignore
        const nextRow = inputRefs.current.slice(0, i).findLastIndex(refs => !!refs[column])
        // @ts-ignore
        if (nextRow > -1) inputRefs.current[nextRow]?.[column]?.focus()
        e.stopPropagation()
      } else if (e.key === 'ArrowLeft' && column !== 'recipient') {
        // only execute this if the cursor is at the beginning of the input
        if (isInputKeyboardEvent(e, column) && e.currentTarget.selectionStart !== 0) return
        e.stopPropagation()
        inputRefs.current[i]?.[findPrevColumn(column)]?.focus()
      } else if (e.key === 'ArrowRight' && column !== 'end') {
        // only execute this if the cursor is at the end of the input
        if (isInputKeyboardEvent(e, column) && e.currentTarget.selectionStart !== e.currentTarget.value.length) return
        e.stopPropagation() // prevents scrolling
        inputRefs.current[i]?.[findNextColumn(column)]?.focus()
      }
    },
    [addLine]
  )

  const handleRef = useCallback<MultisendTableRefHandler>((ref, i, column) => {
    let cur = inputRefs.current[i]
    if (!cur) {
      cur = { amount: null, recipient: null, end: null, start: null, vested: null }
    }
    if (ref === null) return
    inputRefs.current[i] = { ...cur, [column]: ref }
    if (
      column === 'recipient' &&
      i === inputRefs.current.length - 1 &&
      i > lastAddedLine.current &&
      shouldAutoFocus.current
    ) {
      ref.focus()
      lastAddedLine.current = i
    }
  }, [])

  const handleSendChange = useCallback(
    (sends: (MultisendSend | null)[], index: number) => {
      if (sends.length + index > lines) setLines(sends.length + index)

      setSends(prev => {
        const newSends = [...prev]
        sends.forEach((send, i) => {
          if (send === null) return
          newSends[index + i] = send
          if (send.vested?.end === 0 && send.vested?.start === 0) {
            newSends[index + i] = {
              ...send,
              vested: {
                end: defaultEndBlock,
                start: defaultStartBlock,
              },
            }
          }
        })

        return newSends
      })
    },
    [defaultEndBlock, defaultStartBlock, lines, setSends]
  )

  return (
    <div className="grid gap-[4px] pr-[32px] relative">
      <div className="flex items-center justify-end mb-[12px] gap-[8px]">
        <Tooltip
          content={
            <div className="p-[4px]">
              <p className="text-[14px]">The CSV should have the following columns:</p>
              <ul className="[&>li>span]:text-offWhite mt-[4px] mb-[8px]">
                <li>
                  <span>Recipient</span>: The address of the recipient
                </li>
                <li>
                  <span>Amount</span>: The amount to send
                </li>
                <li>
                  <span>Start Block</span> (Optional): The block number to start vesting
                </li>
                <li>
                  <span>End Block</span> (Optional): The block number to end vesting
                </li>
              </ul>
              <a
                download="multisend-template.csv"
                href={encodeURI(
                  `data:text/csv;filename=multisend.csvcharset=utf-8,Recipient,Amount,Start Block,End Block\n`
                )}
                className="text-primary text-[14px] hover:opacity-80"
              >
                Download CSV Template
              </a>

              <p className="mt-[16px] text-[14px]">
                Alternatively, you can copy and paste the rows directly into the table below.
              </p>
              <img
                src={multisendCopyPastaGif}
                alt="Multisend copy-paste example"
                className="w-full max-w-[420px] rounded-[12px] mt-[8px] mb-[12px] border border-gray-400"
              />
            </div>
          }
        >
          <Info size={16} />
        </Tooltip>
        <FileUploadButton
          accept=".csv"
          label="Import CSV"
          multiple={false}
          onFiles={async files => {
            const [file] = files
            if (!file) return
            const text = await file.text()
            const lines = text.split('\n').map(line => line.replaceAll('\r', '').split(','))
            const headerIndex = lines.findIndex(line => line.includes('Recipient') && line.includes('Amount'))

            let addressCol = 0
            let amountCol = 1
            let startCol = 2
            let endCol = 3

            if (headerIndex > -1) {
              const header = lines[headerIndex]
              if (header) {
                addressCol = header.indexOf('Recipient')
                amountCol = header.indexOf('Amount')
                startCol = header.indexOf('Start Block')
                endCol = header.indexOf('End Block')
              }
            }

            let invalidRows: number[] = []
            const sends = lines
              .slice(headerIndex > -1 ? headerIndex + 1 : 0)
              .map((line, index): MultisendSend | null => {
                const address = line[addressCol]
                const amount = line[amountCol]
                const start = line[startCol]
                const end = line[endCol]

                if (!address || !amount) return null

                const recipient = Address.fromSs58(address)
                if (!recipient) {
                  invalidRows.push(index)
                  return null
                }
                if (isNaN(+amount)) {
                  invalidRows.push(index)
                  return null
                }

                if (start && end && start?.length > 0 && end?.length > 0) {
                  if (isNaN(parseInt(start)) || isNaN(parseInt(end))) {
                    invalidRows.push(index)
                    return null
                  }
                  return {
                    recipient,
                    amount,
                    vested: { start: parseInt(start), end: parseInt(end) },
                  }
                }
                return {
                  recipient,
                  amount,
                  vested: undefined,
                }
              })

            if (invalidRows.length === 0) {
              handleSendChange(sends, 0)
            } else {
              toast({
                title: 'Invalid CSV',
                description: `Invalid rows: ${invalidRows.map(index => index + 2 + headerIndex).join(', ')}`,
              })
            }
          }}
        />
      </div>
      <div className="border border-gray-500 rounded-[8px] bg-gray-900 overflow-auto">
        <Table className="text-left w-full min-w-max">
          <TableHeader className="w-full h-[40px]">
            <TableRow>
              <TableHead className="border-r border-gray-500 w-[180px] py-[6px]">
                <div className="flex items-center justify-between w-full">
                  <p className="text-[14px]">Recipient</p>
                  <Tooltip content="Add new line">
                    <Button
                      size="icon"
                      variant="outline"
                      className="w-auto px-[4px] h-auto py-[4px] border-gray-400 leading-none"
                      onClick={addLine}
                    >
                      <PlusIcon size={16} />
                    </Button>
                  </Tooltip>
                </div>
              </TableHead>
              <TableHead className="border-r border-gray-500 w-[140px] py-[6px]">
                <div className="flex items-center justify-between w-full">
                  <p className="text-[14px]">Amount</p>
                  <MultisendTableAmountUnitDropdown />
                </div>
              </TableHead>
              <TableHead className="w-[60px] border-r border-gray-500">Vested</TableHead>
              <TableHead className="w-[120px] border-r border-gray-500">Start Block</TableHead>
              <TableHead className="w-[120px]">End Block</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="w-full">
            {[...Array(lines)].map((_, i) => (
              <MultisendTableRow
                key={i}
                index={i}
                contacts={contacts}
                handleKeyDown={handleKeyDown}
                handleRef={handleRef}
                canVest={token?.type === 'substrate-native'}
                blockTime={blockTime?.toNumber()}
                currentBlock={blockNumber}
                send={sends?.[i] ?? {}}
                onSendsChange={sends => handleSendChange(sends, i)}
                disableVesting={disableVesting}
              />
            ))}
          </TableBody>
        </Table>
        <div className="absolute pt-[90px] right-0 top-0">
          {[...Array(lines)].map((_, i) => (
            <div className="h-[48px] flex items-center justify-center" key={i}>
              <Button size="icon" variant="ghost" onClick={() => removeLine(i)}>
                <XIcon size={16} />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { Address } from '@util/addresses'

export type ColumnsInputType = {
  recipient: HTMLInputElement | null
  amount: HTMLInputElement | null
  vested: HTMLButtonElement | null
  start: HTMLInputElement | null
  end: HTMLInputElement | null
}

export type TableColumnKeys = keyof ColumnsInputType

export type MultisendTableKeyDownHandler = <TKey extends TableColumnKeys>(
  event: React.KeyboardEvent<ColumnsInputType[TKey]>,
  i: number,
  column: TKey
) => void

export type MultisendTableRefHandler = <TKey extends TableColumnKeys>(
  ref: ColumnsInputType[TKey] | null,
  i: number,
  column: TKey
) => void

export type MultisendSend = {
  recipient?: Address
  amount?: string
  amountBN?: bigint
  vested?: {
    start: number
    end: number
  }
  error?: string
}

import { useMemo } from 'react'
import { Contact } from '@domains/offchain-data/address-book/types'
import { PaginatedAddresses } from '@domains/offchain-data/address-book/hooks/useGetPaginatedAddressesByOrgId'
import { PaginationState, useReactTable, getCoreRowModel, ColumnDef, flexRender } from '@tanstack/react-table'
import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { useSelectedMultisig } from '@domains/multisig'
import AddressBookPagination from './AddressBookPagination'
import { cn } from '@util/tailwindcss'
import ActionButtons from './AddressBookActionButtons'

const AddressBookTable = ({
  hideCollaboratorActions,
  dataQuery,
  pagination,
  setPagination,
  isCsvImport,
  isPaidPlan,
  search,
}: {
  dataQuery: PaginatedAddresses | undefined
  hideCollaboratorActions: boolean
  isCsvImport: boolean
  isPaidPlan: boolean
  pagination: PaginationState
  search: string
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>
}) => {
  const [selectedMultisig] = useSelectedMultisig()

  const isLastItemInPage =
    (dataQuery?.pageCount ?? -1) > 1 &&
    pagination.pageIndex + 1 === (dataQuery?.pageCount ?? -1) &&
    dataQuery?.rowCount === 1

  const columns = useMemo<ColumnDef<Contact>[]>(() => {
    const baseColumns: ColumnDef<Contact>[] = [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => (
          <AccountDetails
            address={row.original.address}
            name={row.original.name}
            chain={selectedMultisig.chain}
            withAddressTooltip
            identiconSize={32}
            breakLine
            disableCopy
            hideAddress
          />
        ),
      },
      {
        header: 'Address',
        accessorKey: 'address',
        cell: ({ row }) => (
          <div className={cn('flex items-center gap-3', { 'justify-end': !isPaidPlan })}>
            <div className="block lg:hidden truncate">
              {row.original.address.toShortSs58(selectedMultisig.chain, 'sm')}
            </div>

            <div className="hidden lg:block 2xl:hidden truncate">
              {row.original.address.toShortSs58(selectedMultisig.chain, 'md')}
            </div>
            <div className="hidden 2xl:block truncate">
              {row.original.address.toShortSs58(selectedMultisig.chain, 'xl')}
            </div>
            {!isPaidPlan && (
              <ActionButtons
                row={row}
                hideCollaboratorActions={hideCollaboratorActions}
                isCsvImport={isCsvImport}
                pagination={pagination}
                isLastItemInPage={isLastItemInPage}
                setPagination={setPagination}
              />
            )}
          </div>
        ),
      },
    ]

    const paidColumns: ColumnDef<Contact>[] = [
      {
        header: 'Category',
        accessorKey: 'category.name',
      },
      {
        header: 'Subcategory',
        accessorKey: 'sub_category.name',
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-end">
              <div className="flex items-center truncate gap-3">
                <div className="truncate">{row.original.sub_category?.name}</div>
                <ActionButtons
                  row={row}
                  hideCollaboratorActions={hideCollaboratorActions}
                  isCsvImport={isCsvImport}
                  pagination={pagination}
                  isLastItemInPage={isLastItemInPage}
                  setPagination={setPagination}
                />
              </div>
            </div>
          )
        },
      },
    ]
    if (isPaidPlan) {
      baseColumns.push(...paidColumns)
    }
    return baseColumns
  }, [
    hideCollaboratorActions,
    isCsvImport,
    isLastItemInPage,
    isPaidPlan,
    pagination,
    selectedMultisig.chain,
    setPagination,
  ])

  const defaultData = useMemo(() => [], [])

  const table = useReactTable({
    data: dataQuery?.rows ?? defaultData,
    columns,
    pageCount: dataQuery?.pageCount ?? -1,
    rowCount: dataQuery?.rowCount,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  })

  if (!dataQuery?.rowCount) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 bg-[#1B1B1B] rounded-[16px] ">
        <h2 className="text-offWhite text-[20px] font-bold">
          {search ? 'No contacts found' : 'You have no saved contacts yet'}
        </h2>
      </div>
    )
  }

  return (
    <div className="pt-4 w-full flex flex-col flex-1">
      <div className="grid gap-[8px]">
        <div
          className={cn('grid gap-4 font-semibold px-4', {
            'grid-cols-[1fr_2fr_1fr_1fr]': isPaidPlan,
            'grid-cols-[1fr_1fr]': !isPaidPlan,
          })}
        >
          {table.getHeaderGroups().map(headerGroup =>
            headerGroup.headers.map(header => (
              <div key={header.id} className="p-2 text-left last:text-right last:pr-[62px] text-[14px]">
                {flexRender(header.column.columnDef.header, header.getContext())}
              </div>
            ))
          )}
        </div>

        {/* Rows */}
        {table.getRowModel().rows.map(row => (
          <div
            key={row.id}
            className={cn('grid gap-4 bg-[#1B1B1B] rounded-[16px] py-4 px-4 items-center', {
              'grid-cols-[1fr_2fr_1fr_1fr]': isPaidPlan,
              'grid-cols-[1fr_1fr]': !isPaidPlan,
            })}
          >
            {row.getVisibleCells().map(cell => (
              <div key={cell.id} className={'p-2 flex-grow truncate last:text-right '}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex pt-5 items-end justify-end mt-auto">
        <AddressBookPagination
          currentPage={table.getState().pagination.pageIndex + 1}
          totalPages={table.getPageCount()}
          onNextPage={() => table.nextPage()}
          isNextPageDisabled={!table.getCanNextPage()}
          onPreviousPage={() => table.previousPage()}
          isPreviousPageDisabled={!table.getCanPreviousPage()}
        />
      </div>
    </div>
  )
}

export default AddressBookTable

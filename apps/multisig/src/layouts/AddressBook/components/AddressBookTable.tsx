import { useMemo, useState } from 'react'
import { Contact } from '@domains/offchain-data/address-book/address-book'
import useGetPaginatedAddressesByOrgId from '@domains/offchain-data/address-book/hooks/useGetPaginatedAddressesByOrgId'

import { PaginationState, useReactTable, getCoreRowModel, ColumnDef, flexRender } from '@tanstack/react-table'

const AddressBookTable = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10, // Showing more rows
  })

  const dataQuery = useGetPaginatedAddressesByOrgId(pagination)

  const columns = useMemo<ColumnDef<Contact>[]>(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
      },
      {
        header: 'Address',
        accessorKey: 'address',
      },
      {
        header: 'Category',
        accessorKey: 'category.name',
      },
      {
        header: 'Subcategory',
        accessorKey: 'sub_category.name',
      },
    ],
    []
  )

  const defaultData = useMemo(() => [], [])

  const table = useReactTable({
    data: dataQuery.data?.rows ?? defaultData,
    columns,
    pageCount: dataQuery.data?.pageCount ?? -1,
    rowCount: dataQuery.data?.rowCount,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    getRowId: row => row.id, // Unique key for rows
  })

  return (
    <div className="p-4 w-full">
      <div className="grid gap-4">
        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-4 font-semibold px-4">
          {table
            .getHeaderGroups()
            .map(headerGroup =>
              headerGroup.headers.map(header => (
                <div className="p-2 text-left last:text-right">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              ))
            )}
        </div>

        {/* Rows */}
        {table.getRowModel().rows.map(row => (
          <div
            key={row.id}
            className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-4 bg-[#1B1B1B] hover:bg-red-600 rounded-2xl py-4 px-4"
          >
            {row.getVisibleCells().map(cell => (
              <div key={cell.id} className={'p-2  flex-grow truncate last:text-right'}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-end mt-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {'<'}
        </button>
        <span className="px-4 py-2">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {'>'}
        </button>
      </div>
    </div>
  )
}

export default AddressBookTable

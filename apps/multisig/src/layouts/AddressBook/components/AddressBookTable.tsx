import { useMemo, useState } from 'react'
import { Contact } from '@domains/offchain-data/address-book/address-book'
import useGetPaginatedAddressesByOrgId from '@domains/offchain-data/address-book/hooks/useGetPaginatedAddressesByOrgId'

import { PaginationState, useReactTable, getCoreRowModel, ColumnDef, flexRender } from '@tanstack/react-table'

const AddressBookTable = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 1,
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
  })

  return (
    <div className="p-2">
      <div className="h-2" />
      <table>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                return (
                  <th key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : (
                      <div>{flexRender(header.column.columnDef.header, header.getContext())}</div>
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => {
            return (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => {
                  return <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="h-2" />
      <div className="flex items-center gap-2">
        <button className="border rounded p-1" onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>
          {'<<'}
        </button>
        <button
          className="border rounded p-1"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {'<'}
        </button>
        <button className="border rounded p-1" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          {'>'}
        </button>
        <button className="border rounded p-1" onClick={() => table.lastPage()} disabled={!table.getCanNextPage()}>
          {'>>'}
        </button>
        <span className="flex items-center gap-1">
          <div>Page</div>
          <strong>
            {table.getState().pagination.pageIndex + 1} of {table.getPageCount().toLocaleString()}
          </strong>
        </span>

        {dataQuery.isFetching ? 'Loading...' : null}
      </div>
    </div>
  )
}

export default AddressBookTable

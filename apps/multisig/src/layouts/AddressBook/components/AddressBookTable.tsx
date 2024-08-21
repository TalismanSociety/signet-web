import { useMemo, useCallback, useState } from 'react'
import { Contact } from '@domains/offchain-data/address-book/address-book'
import useGetPaginatedAddressesByOrgId from '@domains/offchain-data/address-book/hooks/useGetPaginatedAddressesByOrgId'
import { PaginationState, useReactTable, getCoreRowModel, ColumnDef, flexRender } from '@tanstack/react-table'
import { AccountDetails } from '@components/AddressInput/AccountDetails'
import { useSelectedMultisig } from '@domains/multisig'
import useCopied from '@hooks/useCopied'
import { CircularProgressIndicator, IconButton } from '@talismn/ui'
import { Copy, Trash } from '@talismn/icons'
import { useDeleteContact } from '@domains/offchain-data/address-book/address-book'
import { clsx } from 'clsx'
import { usePage } from '@hooks/usePage'
import AddressBookPagination from './AddressBookPagination'
import { useNavigate } from 'react-router-dom'

const AddressBookTable = ({ hideCollaboratorActions }: { hideCollaboratorActions: boolean }) => {
  const page = usePage()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: page - 1,
    pageSize: 10, // Showing more rows
  })
  const [selectedMultisig] = useSelectedMultisig()
  const { copy } = useCopied()
  const { deleteContact, deleting } = useDeleteContact()
  const dataQuery = useGetPaginatedAddressesByOrgId(pagination)
  const navigate = useNavigate()

  const isLastItemInPage =
    (dataQuery.data?.pageCount ?? -1) > 1 &&
    pagination.pageIndex + 1 === (dataQuery.data?.pageCount ?? -1) &&
    dataQuery.data?.rowCount === 1

  const handleAddressDeleteSuccess = useCallback(() => {
    if (isLastItemInPage) {
      navigate('#1', { replace: true })
      setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex - 1 }))
    }
  }, [isLastItemInPage, navigate])

  const columns = useMemo<ColumnDef<Contact>[]>(
    () => [
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
          <>
            <div className="block lg:hidden truncate">
              {row.original.address.toShortSs58(selectedMultisig.chain, 'sm')}
            </div>

            <div className="hidden lg:block 2xl:hidden truncate">
              {row.original.address.toShortSs58(selectedMultisig.chain, 'md')}
            </div>
            <div className="hidden 2xl:block truncate">
              {row.original.address.toShortSs58(selectedMultisig.chain, 'xl')}
            </div>
          </>
        ),
      },
      {
        header: 'Category',
        accessorKey: 'category.name',
      },
      {
        header: 'Subcategory',
        accessorKey: 'sub_category.name',
        cell: ({ row }) => {
          const addressTosS58 = row.original.address.toSs58(selectedMultisig.chain)
          return (
            <div className="flex items-center justify-end">
              <div className="flex items-center truncate gap-3">
                <div className="truncate">{row.original.sub_category?.name}</div>
                <div
                  className={clsx('flex items-center flex-row w-[2rem] text-[#a5a5a5]', {
                    'w-[5rem]': !hideCollaboratorActions,
                  })}
                  css={({ color }) => ({
                    button: { color: color.lightGrey },
                  })}
                >
                  <IconButton onClick={() => copy(addressTosS58, 'Address copied!', addressTosS58)}>
                    <Copy size={16} />
                  </IconButton>
                  {!hideCollaboratorActions && (
                    <IconButton
                      onClick={() => deleteContact(row.original.id, pagination, handleAddressDeleteSuccess)}
                      disabled={deleting}
                    >
                      {deleting ? <CircularProgressIndicator size={16} /> : <Trash size={16} />}
                    </IconButton>
                  )}
                </div>
              </div>
            </div>
          )
        },
      },
    ],
    [
      copy,
      deleteContact,
      deleting,
      handleAddressDeleteSuccess,
      hideCollaboratorActions,
      pagination,
      selectedMultisig.chain,
    ]
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
    <div className="pt-4 w-full">
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
            className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-4 bg-[#1B1B1B] rounded-2xl py-4 px-4 items-center"
          >
            {row.getVisibleCells().map(cell => (
              <div key={cell.id} className={'p-2 flex-grow truncate'}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ))}
          </div>
        ))}
      </div>
      <AddressBookPagination
        currentPage={table.getState().pagination.pageIndex + 1}
        totalPages={table.getPageCount()}
        onNextPage={() => table.nextPage()}
        isNextPageDisabled={!table.getCanNextPage()}
        onPreviousPage={() => table.previousPage()}
        isPreviousPageDisabled={!table.getCanPreviousPage()}
      />
    </div>
  )
}

export default AddressBookTable

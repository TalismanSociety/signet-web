import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Skeleton } from '@talismn/ui'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading: boolean
}

export default function PendingVotesTable<TData, TValue>({ columns, data, isLoading }: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const renderTableBodyContent = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length} className="h-24 text-center">
            <Skeleton.Surface className="h-12 w-full" />
          </TableCell>
        </TableRow>
      )
    }

    if (table.getRowModel().rows?.length) {
      return table.getRowModel().rows.map(row => (
        <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
          {row.getVisibleCells().map(cell => (
            <TableCell className="px-6 py-4" key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>
      ))
    }

    return (
      <TableRow>
        <TableCell colSpan={columns.length} className="h-24 text-center">
          No pending votes
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="border border-gray-500 rounded-[8px] bg-gray-900">
      <Table>
        <TableHeader className="w-full h-[40px]">
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                return (
                  <TableHead key={header.id} className="px-6">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>{renderTableBodyContent()}</TableBody>
      </Table>
    </div>
  )
}

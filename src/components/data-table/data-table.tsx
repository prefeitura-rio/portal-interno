import { type Table as TanstackTable, flexRender } from '@tanstack/react-table'
import type * as React from 'react'

import { DataTablePagination } from '@/components/data-table/data-table-pagination'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCommonPinningStyles } from '@/lib/data-table'
import { cn } from '@/lib/utils'

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  table: TanstackTable<TData>
  actionBar?: React.ReactNode
  onRowClick?: (row: TData) => void
  loading?: boolean
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  onRowClick,
  loading = false,
  ...props
}: DataTableProps<TData>) {
  // Show skeleton while loading
  if (loading) {
    return (
      <div
        className={cn('flex w-full flex-col gap-2.5 overflow-auto', className)}
        {...props}
      >
        {children}
        <DataTableSkeleton
          columnCount={table.getAllColumns().length}
          rowCount={10}
          withPagination={true}
          withViewOptions={false}
        />
      </div>
    )
  }

  return (
    <div
      className={cn('flex w-full flex-col gap-2.5 overflow-auto', className)}
      {...props}
    >
      {children}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{
                      ...getCommonPinningStyles({ column: header.column }),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={e => {
                    // Don't trigger row click if clicking on interactive elements
                    if (e.target instanceof Element) {
                      const target = e.target as Element
                      if (
                        target.closest('button') ||
                        target.closest('input') ||
                        target.closest('a') ||
                        target.closest('[role="button"]') ||
                        target.closest('[data-radix-collection-item]')
                      ) {
                        return
                      }
                    }
                    onRowClick?.(row.original)
                  }}
                  className={
                    onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''
                  }
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell
                      key={cell.id}
                      style={{
                        ...getCommonPinningStyles({ column: cell.column }),
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} />
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  )
}

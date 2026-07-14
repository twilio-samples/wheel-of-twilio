"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { Stages } from "../types";
import { dataFont } from "../fonts";
import { SURFACE } from "./palette";
import { ClaimButton, StatusPill, statusColor } from "./status";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getCoreRowModel: getCoreRowModel(),
    state: {
      columnFilters,
    },
    initialState: {
      columnVisibility: {
        key: false,
      },
    },
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="sm:w-64 border-[#24365F] bg-[#0B1B3E] text-[#FDF7F4] placeholder:text-[#7C89AC] focus-visible:ring-[#EF223A]"
        />
        <Input
          placeholder="Search sender..."
          value={(table.getColumn("sender")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("sender")?.setFilterValue(event.target.value)
          }
          className="sm:w-64 border-[#24365F] bg-[#0B1B3E] text-[#FDF7F4] placeholder:text-[#7C89AC] focus-visible:ring-[#EF223A]"
        />
      </div>

      {rows.length === 0 ? (
        <div
          className="rounded-md border px-6 py-16 text-center text-sm text-[#7C89AC]"
          style={{ borderColor: SURFACE.line, backgroundColor: SURFACE.card }}
        >
          No winners match yet.
        </div>
      ) : (
        <>
          {/* Mobile: ticket-stub cards — a table's columns don't survive a
              narrow screen, but each row is one claim ticket, so a stub reads
              naturally at any width. */}
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => {
              const original = row.original as any;
              return (
                <div
                  key={row.id}
                  className="relative rounded-md border py-4 pl-4 pr-4"
                  style={{
                    borderColor: SURFACE.line,
                    backgroundColor: SURFACE.card,
                    borderLeftWidth: 4,
                    borderLeftColor: statusColor(original.stage),
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-[#FDF7F4]">
                        {original.name}
                      </div>
                      <div
                        className={`mt-0.5 text-xs text-[#7C89AC] ${dataFont.className}`}
                      >
                        {original.sender}
                      </div>
                    </div>
                    <StatusPill stage={original.stage} />
                  </div>
                  {original.smallPrize && (
                    <div className="mt-2 text-sm text-[#B9C3D9]">
                      {original.smallPrize}
                    </div>
                  )}
                  {original.stage === Stages.WINNER_UNCLAIMED && (
                    <div className="mt-3">
                      <ClaimButton winnerKey={original.key} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: full table */}
          <div
            className="hidden md:block rounded-md border overflow-auto"
            style={{ borderColor: SURFACE.line, backgroundColor: SURFACE.card }}
          >
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="hover:bg-transparent"
                    style={{ borderColor: SURFACE.line }}
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-xs uppercase tracking-wide text-[#7C89AC] font-medium"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-[#12275A]"
                    style={{ borderColor: SURFACE.line }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="text-[#DCE3F5]">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

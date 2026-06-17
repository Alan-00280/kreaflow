'use client'

import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

interface Order {
  id: string
  invoiceNumber: string
  recordedByUserId: string
  customerId: string
  totalAmount: string
  createdAt: string
  customer?: {
    name: string
    generation: number | null
  }
  recordedByUser?: {
    name: string
    role: string
  }
}

interface OrderListTableProps {
  orders: Order[]
  onView: (orderId: string) => void
}

export function OrderListTable({ orders, onView }: OrderListTableProps) {
  const formatRupiah = (value: string) => {
    const numeric = parseFloat(value)
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(numeric)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(d)
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg bg-card">
        <p className="text-muted-foreground text-sm">Tidak ada transaksi ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nomor Invoice</TableHead>
            <TableHead>Pelanggan</TableHead>
            <TableHead>Dicatat Oleh</TableHead>
            <TableHead className="text-right w-40">Total Transaksi</TableHead>
            <TableHead>Tanggal Transaksi</TableHead>
            <TableHead className="text-center w-28">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-accent/40 transition-colors">
              <TableCell className="font-semibold text-primary">{order.invoiceNumber}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{order.customer?.name || '-'}</span>
                  {order.customer?.generation && (
                    <span className="text-xs text-muted-foreground">Angkatan {order.customer.generation}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{order.recordedByUser?.name || '-'}</span>
                  <span className="text-xs text-muted-foreground uppercase">{order.recordedByUser?.role}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-primary">
                {formatRupiah(order.totalAmount)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(order.createdAt)}
              </TableCell>
              <TableCell className="text-center">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 hover:text-primary hover:border-primary"
                  onClick={() => onView(order.id)}
                  type="button"
                  title="Detail Transaksi"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

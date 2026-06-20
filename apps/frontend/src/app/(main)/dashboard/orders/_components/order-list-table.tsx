'use client'

import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WhatsAppButton } from '@/components/whatsapp-button'
import { cn } from '@/lib/utils'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
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
  'order-date': string
  createdAt: string
  paymentStatus: 'lunas' | 'belum_lunas'
  pickupStatus: 'belum_diambil' | 'sudah_diambil' | 'ditunda'
  customer?: {
    name: string
    phoneNumber: string | null
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
  onUpdateStatus: (orderId: string, updates: { paymentStatus?: 'lunas' | 'belum_lunas'; pickupStatus?: 'belum_diambil' | 'sudah_diambil' | 'ditunda' }) => void
}

export function OrderListTable({ orders, onView, onUpdateStatus }: OrderListTableProps) {
  const formatRupiah = (value: string) => {
    const numeric = parseFloat(value)
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(numeric)
  }

  const getPaymentStatusSelectClass = (status: string) => {
    switch (status) {
      case 'lunas':
        return "[&_select]:bg-emerald-500/10 [&_select]:text-emerald-600 [&_select]:border-emerald-500/20"
      case 'belum_lunas':
      default:
        return "[&_select]:bg-rose-500/10 [&_select]:text-rose-600 [&_select]:border-rose-500/20"
    }
  }

  const getPickupStatusSelectClass = (status: string) => {
    switch (status) {
      case 'sudah_diambil':
        return "[&_select]:bg-emerald-500/10 [&_select]:text-emerald-600 [&_select]:border-emerald-500/20"
      case 'ditunda':
        return "[&_select]:bg-slate-500/10 [&_select]:text-slate-600 [&_select]:border-slate-500/20"
      case 'belum_diambil':
      default:
        return "[&_select]:bg-amber-500/10 [&_select]:text-amber-600 [&_select]:border-amber-500/20"
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(d)
  }

  const formatOrderDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium'
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
            <TableHead className="text-center">Status Bayar</TableHead>
            <TableHead className="text-center">Status Ambil</TableHead>
            <TableHead className="text-center w-32">Aksi</TableHead>
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
                {formatOrderDate(order['order-date'])}
              </TableCell>
              <TableCell className="text-center">
                <NativeSelect
                  size="sm"
                  className={cn("w-32 mx-auto", getPaymentStatusSelectClass(order.paymentStatus))}
                  value={order.paymentStatus}
                  onChange={(e) => onUpdateStatus(order.id, { paymentStatus: e.target.value as any })}
                >
                  <NativeSelectOption value="belum_lunas">Belum Lunas</NativeSelectOption>
                  <NativeSelectOption value="lunas">Lunas</NativeSelectOption>
                </NativeSelect>
              </TableCell>
              <TableCell className="text-center">
                <NativeSelect
                  size="sm"
                  className={cn("w-36 mx-auto", getPickupStatusSelectClass(order.pickupStatus))}
                  value={order.pickupStatus}
                  onChange={(e) => onUpdateStatus(order.id, { pickupStatus: e.target.value as any })}
                >
                  <NativeSelectOption value="belum_diambil">Belum Diambil</NativeSelectOption>
                  <NativeSelectOption value="sudah_diambil">Sudah Diambil</NativeSelectOption>
                  <NativeSelectOption value="ditunda">Ditunda</NativeSelectOption>
                </NativeSelect>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-1.5">
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
                  {order.customer?.phoneNumber ? (
                    <WhatsAppButton
                      phone={order.customer.phoneNumber}
                      name={order.customer.name}
                      size="icon"
                      variant="outline"
                      title="Hubungi via WhatsApp"
                      className="h-8 w-8"
                    />
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

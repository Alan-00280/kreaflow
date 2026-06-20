'use client'

import { useState, useEffect } from 'react'
import { PlusCircle, Calendar as CalendarIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from '@/components/providers/session-provider'
import { getOrdersAction, updateOrderStatusAction } from '@/server/order-actions'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

import { OrderListTable } from './_components/order-list-table'
import { OrderDetailDialog } from './_components/order-detail-dialog'

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

export default function OrdersPage() {
  const session = useSession()
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Search, Date & Pagination States
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [filterPayment, setFilterPayment] = useState<string>('all')
  const [filterPickup, setFilterPickup] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const fetchOrders = async () => {
    setIsLoading(true)
    const res = await getOrdersAction()
    if (res.success && res.orders) {
      setOrders(res.orders)
    } else {
      toast.error('Gagal memuat riwayat pesanan', { description: res.error })
    }
    setIsLoading(false)
  }

  const handleUpdateOrderStatus = async (
    orderId: string,
    updates: { paymentStatus?: 'lunas' | 'belum_lunas'; pickupStatus?: 'belum_diambil' | 'sudah_diambil' | 'ditunda' }
  ) => {
    const toastId = toast.loading('Memperbarui status pesanan...')
    const res = await updateOrderStatusAction(orderId, updates)
    if (res.success) {
      toast.success('Status pesanan berhasil diperbarui!', { id: toastId })
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                paymentStatus: updates.paymentStatus ?? o.paymentStatus,
                pickupStatus: updates.pickupStatus ?? o.pickupStatus
              }
            : o
        )
      )
    } else {
      toast.error('Gagal memperbarui status', { id: toastId, description: res.error })
    }
  }

  useEffect(() => {
    if (session) {
      fetchOrders()
    }
  }, [session])

  // Reset to page 1 on search, date, or status filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, startDate, endDate, filterPayment, filterPickup])

  const handleOpenDetail = (id: string) => {
    setSelectedOrderId(id)
    setIsDetailOpen(true)
  }

  const getYYYYMMDD = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Client-side filtering logic (by invoice number, customer name, and order-date)
  const filteredOrders = orders.filter((order) => {
    const matchesInvoice = order.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCustomer = order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    
    const orderDateStr = order['order-date'] // YYYY-MM-DD
    let matchesDate = true
    if (startDate) {
      const startStr = getYYYYMMDD(startDate)
      if (orderDateStr < startStr) matchesDate = false
    }
    if (endDate) {
      const endStr = getYYYYMMDD(endDate)
      if (orderDateStr > endStr) matchesDate = false
    }

    const matchesPayment = filterPayment === 'all' || order.paymentStatus === filterPayment
    const matchesPickup = filterPickup === 'all' || order.pickupStatus === filterPickup

    return (matchesInvoice || matchesCustomer) && matchesDate && matchesPayment && matchesPickup
  })

  // Pagination calculation
  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Riwayat Nota Pesanan</h1>
          <p className="text-muted-foreground text-sm">
            Lihat seluruh riwayat nota pesanan yang tercatat dalam sistem.
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/orders/new')} className="flex items-center gap-1.5">
          <PlusCircle className="h-4 w-4" /> Catat Pesanan
        </Button>
      </div>

      {/* Filter Control Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Search */}
        <div className="w-full sm:max-w-xs">
          <Input
            placeholder="Cari invoice / pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Date Pickers */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-40">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left font-normal text-xs h-9",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {startDate ? (
                    new Intl.DateTimeFormat('id-ID', { dateStyle: 'short' }).format(startDate)
                  ) : (
                    <span>Mulai Tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <span className="text-muted-foreground text-xs">s/d</span>

          <div className="w-40">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left font-normal text-xs h-9",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {endDate ? (
                    new Intl.DateTimeFormat('id-ID', { dateStyle: 'short' }).format(endDate)
                  ) : (
                    <span>Sampai Tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <NativeSelect
            size="sm"
            className="w-36 h-9"
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
          >
            <NativeSelectOption value="all">Semua Bayar</NativeSelectOption>
            <NativeSelectOption value="belum_lunas">Belum Lunas</NativeSelectOption>
            <NativeSelectOption value="lunas">Lunas</NativeSelectOption>
          </NativeSelect>

          <NativeSelect
            size="sm"
            className="w-40 h-9"
            value={filterPickup}
            onChange={(e) => setFilterPickup(e.target.value)}
          >
            <NativeSelectOption value="all">Semua Ambil</NativeSelectOption>
            <NativeSelectOption value="belum_diambil">Belum Diambil</NativeSelectOption>
            <NativeSelectOption value="sudah_diambil">Sudah Diambil</NativeSelectOption>
            <NativeSelectOption value="ditunda">Ditunda</NativeSelectOption>
          </NativeSelect>

          {(startDate || endDate || filterPayment !== 'all' || filterPickup !== 'all') && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate(undefined)
                setEndDate(undefined)
                setFilterPayment('all')
                setFilterPickup('all')
              }}
              className="h-9 text-xs px-2 text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat riwayat transaksi...</div>
      ) : (
        <div className="flex flex-col gap-4">
          <OrderListTable orders={paginatedOrders} onView={handleOpenDetail} onUpdateStatus={handleUpdateOrderStatus} />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={page === currentPage}
                        onClick={(e) => {
                          e.preventDefault()
                          setCurrentPage(page)
                        }}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }}
                      className={currentPage === totalPages || totalPages === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}

      {/* Detail View Dialog */}
      <OrderDetailDialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        orderId={selectedOrderId}
      />
    </div>
  )
}

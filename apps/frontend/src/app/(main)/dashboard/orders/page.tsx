'use client'

import { Fragment, useState, useEffect, useRef } from 'react'
import { PlusCircle, Calendar as CalendarIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from '@/components/providers/session-provider'
import { getOrdersAction, updateOrderStatusAction, deleteOrderAction } from '@/server/order-actions'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
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
import { DeleteConfirmDialog } from './_components/delete-confirm-dialog'

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

interface OrdersPageState {
  currentPage: number
  searchQuery: string
  startDate: Date | undefined
  endDate: Date | undefined
  filterPayment: 'all' | 'lunas' | 'belum_lunas'
  filterPickup: 'all' | 'belum_diambil' | 'sudah_diambil' | 'ditunda'
  filterGeneration: string
}

const ORDERS_PAGE_STATE_KEY = 'kreaflow:orders:state'

function parseOrdersPageState(rawState: string | null): OrdersPageState | null {
  if (!rawState) return null

  try {
    const saved: unknown = JSON.parse(rawState)
    if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) return null

    const state = saved as Record<string, unknown>
    const isValidDate = (value: unknown): value is string | null =>
      value === null || (typeof value === 'string' && !Number.isNaN(new Date(value).getTime()))

    if (
      !Number.isSafeInteger(state.currentPage) ||
      (state.currentPage as number) < 1 ||
      typeof state.searchQuery !== 'string' ||
      !isValidDate(state.startDate) ||
      !isValidDate(state.endDate) ||
      !['all', 'lunas', 'belum_lunas'].includes(state.filterPayment as string) ||
      !['all', 'belum_diambil', 'sudah_diambil', 'ditunda'].includes(state.filterPickup as string) ||
      typeof state.filterGeneration !== 'string'
    ) {
      return null
    }

    return {
      currentPage: state.currentPage as number,
      searchQuery: state.searchQuery,
      startDate: state.startDate ? new Date(state.startDate) : undefined,
      endDate: state.endDate ? new Date(state.endDate) : undefined,
      filterPayment: state.filterPayment as OrdersPageState['filterPayment'],
      filterPickup: state.filterPickup as OrdersPageState['filterPickup'],
      filterGeneration: state.filterGeneration
    }
  } catch {
    return null
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
  const [filterGeneration, setFilterGeneration] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isStateRestored, setIsStateRestored] = useState(false)
  const previousFiltersRef = useRef<{
    searchQuery: string
    startDate: Date | undefined
    endDate: Date | undefined
    filterPayment: string
    filterPickup: string
    filterGeneration: string
  } | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  useEffect(() => {
    let savedState: OrdersPageState | null = null
    try {
      savedState = parseOrdersPageState(sessionStorage.getItem(ORDERS_PAGE_STATE_KEY))
    } catch (error) {
      console.error('Failed to read orders page state:', error)
    }
    if (savedState) {
      setCurrentPage(savedState.currentPage)
      setSearchQuery(savedState.searchQuery)
      setStartDate(savedState.startDate)
      setEndDate(savedState.endDate)
      setFilterPayment(savedState.filterPayment)
      setFilterPickup(savedState.filterPickup)
      setFilterGeneration(savedState.filterGeneration)
    }
    setIsStateRestored(true)
  }, [])

  useEffect(() => {
    if (!isStateRestored) return

    try {
      sessionStorage.setItem(
        ORDERS_PAGE_STATE_KEY,
        JSON.stringify({
          currentPage,
          searchQuery,
          startDate: startDate?.toISOString() ?? null,
          endDate: endDate?.toISOString() ?? null,
          filterPayment,
          filterPickup,
          filterGeneration
        })
      )
    } catch (error) {
      console.error('Failed to save orders page state:', error)
    }
  }, [
    currentPage,
    endDate,
    filterGeneration,
    filterPayment,
    filterPickup,
    isStateRestored,
    searchQuery,
    startDate
  ])

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

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return
    const toastId = toast.loading('Menghapus nota pesanan...')
    const res = await deleteOrderAction(selectedOrder.id)
    if (res.success) {
      toast.success('Nota pesanan berhasil dihapus!', { id: toastId })
      setIsDeleteOpen(false)
      setSelectedOrder(null)
      fetchOrders()
    } else {
      toast.error('Gagal menghapus nota pesanan', { id: toastId, description: res.error })
    }
  }

  useEffect(() => {
    if (session) {
      fetchOrders()
    }
  }, [session])

  // Reset to page 1 on search, date, status, or generation filter change
  useEffect(() => {
    if (!isStateRestored) return

    const currentFilters = {
      searchQuery,
      startDate,
      endDate,
      filterPayment,
      filterPickup,
      filterGeneration
    }
    const previousFilters = previousFiltersRef.current
    previousFiltersRef.current = currentFilters

    if (
      previousFilters &&
      (
        previousFilters.searchQuery !== searchQuery ||
        previousFilters.startDate !== startDate ||
        previousFilters.endDate !== endDate ||
        previousFilters.filterPayment !== filterPayment ||
        previousFilters.filterPickup !== filterPickup ||
        previousFilters.filterGeneration !== filterGeneration
      )
    ) {
      setCurrentPage(1)
    }
  }, [searchQuery, startDate, endDate, filterPayment, filterPickup, filterGeneration, isStateRestored])

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

    const matchesGeneration =
      filterGeneration.trim() === '' ||
      (order.customer?.generation !== undefined &&
        order.customer?.generation !== null &&
        Number(order.customer.generation) === Number(filterGeneration))

    return (matchesInvoice || matchesCustomer) && matchesDate && matchesPayment && matchesPickup && matchesGeneration
  })

  // Pagination calculation
  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)
  useEffect(() => {
    if (isStateRestored && !isLoading && currentPage > totalPages) {
      setCurrentPage(Math.max(totalPages, 1))
    }
  }, [currentPage, isLoading, isStateRestored, totalPages])

  const visiblePageNumbers =
    totalPages <= 5
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : Array.from(
          new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter((page) => page >= 1 && page <= totalPages))
        )
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

          <div className="w-28">
            <Input
              type="number"
              value={filterGeneration}
              onChange={(e) => setFilterGeneration(e.target.value)}
              placeholder="Angkatan"
              className="h-9 text-xs"
            />
          </div>

          {(startDate || endDate || filterPayment !== 'all' || filterPickup !== 'all' || filterGeneration) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate(undefined)
                setEndDate(undefined)
                setFilterPayment('all')
                setFilterPickup('all')
                setFilterGeneration('')
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
          <OrderListTable
            orders={paginatedOrders}
            onView={handleOpenDetail}
            onEdit={(id) => router.push(`/dashboard/orders/${id}/edit`)}
            onDelete={(order) => {
              setSelectedOrder(order)
              setIsDeleteOpen(true)
            }}
            onUpdateStatus={handleUpdateOrderStatus}
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <div className="flex w-full items-center justify-between sm:hidden">
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault()
                    setCurrentPage((page) => Math.max(page - 1, 1))
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
                <span className="text-sm text-muted-foreground" aria-live="polite">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault()
                    setCurrentPage((page) => Math.min(page + 1, totalPages))
                  }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </div>
              <Pagination className="hidden sm:flex">
                <PaginationContent className="gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault()
                        setCurrentPage((page) => Math.max(page - 1, 1))
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                    />
                  </PaginationItem>
                  {visiblePageNumbers.map((page, index) => (
                    <Fragment key={page}>
                      {index > 0 && page - visiblePageNumbers[index - 1] > 1 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          isActive={page === currentPage}
                          onClick={(event) => {
                            event.preventDefault()
                            setCurrentPage(page)
                          }}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    </Fragment>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault()
                        setCurrentPage((page) => Math.min(page + 1, totalPages))
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
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

      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setSelectedOrder(null)
        }}
        order={selectedOrder}
        onConfirm={handleDeleteOrder}
      />
    </div>
  )
}

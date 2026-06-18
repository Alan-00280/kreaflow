'use client'

import { useState, useEffect } from 'react'
import { PlusCircle, Calendar as CalendarIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from '@/components/providers/session-provider'
import { getOrdersAction } from '@/server/order-actions'
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

  useEffect(() => {
    if (session) {
      fetchOrders()
    }
  }, [session])

  // Reset to page 1 on search or date change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, startDate, endDate])

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

    return (matchesInvoice || matchesCustomer) && matchesDate
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

          {(startDate || endDate) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate(undefined)
                setEndDate(undefined)
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
          <OrderListTable orders={paginatedOrders} onView={handleOpenDetail} />

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

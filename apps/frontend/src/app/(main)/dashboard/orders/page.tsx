'use client'

import { useState, useEffect } from 'react'
import { PlusCircle } from 'lucide-react'
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

import { OrderListTable } from './_components/order-list-table'
import { OrderDetailDialog } from './_components/order-detail-dialog'

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

export default function OrdersPage() {
  const session = useSession()
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Search & Pagination States
  const [searchQuery, setSearchQuery] = useState('')
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

  // Reset to page 1 on search change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const handleOpenDetail = (id: string) => {
    setSelectedOrderId(id)
    setIsDetailOpen(true)
  }

  // Client-side filtering logic (by invoice number or customer name)
  const filteredOrders = orders.filter((order) => {
    const matchesInvoice = order.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCustomer = order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    return matchesInvoice || matchesCustomer
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

      {/* Search Filter Control */}
      <div className="w-full sm:max-w-xs">
        <Input
          placeholder="Cari invoice / pelanggan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
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

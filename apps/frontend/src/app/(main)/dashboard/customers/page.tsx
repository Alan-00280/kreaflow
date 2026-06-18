'use client'

import { useState, useEffect } from 'react'
import { Search, User, Calendar as CalendarIcon, Hash } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { useSession } from '@/components/providers/session-provider'
import { getCustomersAction } from '@/server/customer-actions'
import { WhatsAppButton } from '@/components/whatsapp-button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'

interface Customer {
  id: string
  name: string
  phoneNumber: string | null
  generation: number | null
  createdAt: string
  updatedAt: string
}

export default function CustomersPage() {
  const session = useSession()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Search & Pagination States
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchCustomers = async () => {
    setIsLoading(true)
    const res = await getCustomersAction()
    if (res.success && res.customers) {
      setCustomers(res.customers)
    } else {
      toast.error('Gagal memuat daftar pelanggan', { description: res.error })
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (session) {
      fetchCustomers()
    }
  }, [session])

  // Reset to page 1 on search change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])



  // Client-side filtering logic
  const filteredCustomers = customers.filter((cust) => {
    const matchesName = cust.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPhone = cust.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    return matchesName || matchesPhone
  })

  // Pagination calculation
  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE)
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium'
    }).format(d)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Daftar Pelanggan</h1>
        <p className="text-muted-foreground text-sm">
          Lihat seluruh informasi dan riwayat kontak pelanggan yang terdaftar di dalam sistem.
        </p>
      </div>

      {/* Filter Control */}
      <div className="w-full sm:max-w-xs relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama / nomor HP..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat data pelanggan...</div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Nama Pelanggan</TableHead>
                  <TableHead>Nomor HP / WhatsApp</TableHead>
                  <TableHead>Angkatan</TableHead>
                  <TableHead>Tanggal Terdaftar</TableHead>
                  <TableHead className="text-center w-28">Hubungi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((cust, idx) => (
                  <TableRow key={cust.id} className="hover:bg-accent/40 transition-colors">
                    <TableCell className="text-center text-muted-foreground">
                      {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      {cust.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {cust.phoneNumber || <span className="italic text-muted-foreground/40">-</span>}
                    </TableCell>
                    <TableCell>
                      {cust.generation ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          <Hash className="h-3 w-3" /> {cust.generation}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                          Umum
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {formatDate(cust.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {cust.phoneNumber ? (
                        <WhatsAppButton phone={cust.phoneNumber} name={cust.name} size="sm">
                          WA ↗
                        </WhatsAppButton>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 italic">Tidak ada kontak</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Tidak ada pelanggan ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

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
    </div>
  )
}

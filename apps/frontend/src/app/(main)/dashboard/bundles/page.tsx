'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useSession } from '@/components/providers/session-provider'
import {
  getBundlesAction,
  createBundleAction,
  updateBundleAction,
  deleteBundleAction
} from '@/server/bundle-actions'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'

import { BundleListTable } from './_components/bundle-list-table'
import { BundleDialog } from './_components/bundle-dialog'
import { DeleteConfirmDialog } from './_components/delete-confirm-dialog'

interface Bundle {
  id: string
  name: string
  description: string | null
  bundlePrice: string
  isActive: boolean
  createdAt: string
}

export default function BundlesPage() {
  const session = useSession()
  const isAdmin = session?.role === 'admin'

  const [bundles, setBundles] = useState<Bundle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null)

  // Search, Filter, and Pagination States
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isReadOnly, setIsReadOnly] = useState(false)

  const fetchBundles = async () => {
    setIsLoading(true)
    const res = await getBundlesAction()
    if (res.success && res.bundles) {
      if (session?.role === 'operator') {
        // Operator RBAC: only see active bundles
        setBundles(res.bundles.filter((b: Bundle) => b.isActive))
      } else {
        setBundles(res.bundles)
      }
    } else {
      toast.error('Gagal memuat paket bundling', { description: res.error })
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (session) {
      fetchBundles()
    }
  }, [session])

  // Reset page to 1 when search or filter values change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  const handleCreateOrUpdate = async (data: any) => {
    let res
    if (selectedBundle) {
      res = await updateBundleAction(selectedBundle.id, data)
    } else {
      res = await createBundleAction(data)
    }

    if (res.success) {
      toast.success(selectedBundle ? 'Paket bundling berhasil diperbarui!' : 'Paket bundling baru berhasil dibuat!')
      setIsFormOpen(false)
      fetchBundles()
    } else {
      toast.error('Gagal menyimpan paket bundling', { description: res.error })
    }
  }

  const handleDelete = async () => {
    if (!selectedBundle) return
    const res = await deleteBundleAction(selectedBundle.id)
    if (res.success) {
      toast.success('Paket bundling berhasil dihapus!')
      setIsDeleteOpen(false)
      fetchBundles()
    } else {
      toast.error('Gagal menghapus paket bundling', { description: res.error })
    }
  }

  const openCreateDialog = () => {
    setSelectedBundle(null)
    setIsReadOnly(false)
    setIsFormOpen(true)
  }

  const openViewDialog = (bundle: Bundle) => {
    setSelectedBundle(bundle)
    setIsReadOnly(true)
    setIsFormOpen(true)
  }

  const openEditDialog = (bundle: Bundle) => {
    setSelectedBundle(bundle)
    setIsReadOnly(false)
    setIsFormOpen(true)
  }

  const openDeleteDialog = (bundle: Bundle) => {
    setSelectedBundle(bundle)
    setIsDeleteOpen(true)
  }

  // Client-side filtering logic
  const filteredBundles = bundles.filter((bundle) => {
    const matchesSearch = bundle.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = 
      statusFilter === 'all' 
        ? true 
        : statusFilter === 'active' 
          ? bundle.isActive 
          : !bundle.isActive
    return matchesSearch && matchesStatus
  })

  // Pagination calculation
  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filteredBundles.length / ITEMS_PER_PAGE)
  const paginatedBundles = filteredBundles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Manajemen Paket Bundling</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin 
              ? 'Kelola kombinasi paket bundling produk satuan beserta harga promosi.' 
              : 'Daftar paket bundling produk aktif dalam sistem.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} className="flex items-center gap-1">
            <Plus className="h-4 w-4" /> Tambah Paket
          </Button>
        )}
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:max-w-xs">
          <Input
            placeholder="Cari nama paket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {isAdmin && (
          <div className="w-full sm:w-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Filter Status:</span>
            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full sm:w-40"
            >
              <NativeSelectOption value="all">Semua Status</NativeSelectOption>
              <NativeSelectOption value="active">Aktif</NativeSelectOption>
              <NativeSelectOption value="inactive">Non-aktif</NativeSelectOption>
            </NativeSelect>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat paket bundling...</div>
      ) : (
        <div className="flex flex-col gap-4">
          <BundleListTable
            bundles={paginatedBundles}
            isAdmin={isAdmin}
            onView={openViewDialog}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
          />

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

      {/* Forms & Modals */}
      <BundleDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        bundle={selectedBundle}
        onSubmit={handleCreateOrUpdate}
        isReadOnly={isReadOnly}
      />
      {isAdmin && (
        <DeleteConfirmDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          bundle={selectedBundle}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

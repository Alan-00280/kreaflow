'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from '@/components/providers/session-provider'
import {
  getVariantGroupsAction,
  createVariantGroupAction,
  updateVariantGroupAction,
  deleteVariantGroupAction
} from '@/server/variant-group-actions'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'

import { VariantGroupListTable } from './_components/variant-group-list-table'
import { VariantGroupDialog } from './_components/variant-group-dialog'
import { DeleteConfirmDialog } from './_components/delete-confirm-dialog'

interface VariantGroup {
  id: string
  name: string
  createdAt: string
}

export default function VariantGroupsPage() {
  const session = useSession()
  const isAdmin = session?.role === 'admin'

  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<VariantGroup | null>(null)

  // Search and Pagination States
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isReadOnly, setIsReadOnly] = useState(false)

  const fetchVariantGroups = async () => {
    setIsLoading(true)
    const res = await getVariantGroupsAction()
    if (res.success && res.variantGroups) {
      setVariantGroups(res.variantGroups)
    } else {
      toast.error('Gagal memuat kelompok varian', { description: res.error })
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (session) {
      fetchVariantGroups()
    }
  }, [session])

  // Reset page to 1 when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const handleCreateOrUpdate = async (data: { name: string }) => {
    let res
    if (selectedGroup) {
      res = await updateVariantGroupAction(selectedGroup.id, data)
    } else {
      res = await createVariantGroupAction(data)
    }

    if (res.success) {
      toast.success(selectedGroup ? 'Kelompok varian berhasil diperbarui!' : 'Kelompok varian baru berhasil dibuat!')
      setIsFormOpen(false)
      fetchVariantGroups()
    } else {
      toast.error('Gagal menyimpan kelompok varian', { description: res.error })
    }
  }

  const handleDelete = async () => {
    if (!selectedGroup) return
    const res = await deleteVariantGroupAction(selectedGroup.id)
    if (res.success) {
      toast.success('Kelompok varian berhasil dihapus!')
      setIsDeleteOpen(false)
      fetchVariantGroups()
    } else {
      toast.error('Gagal menghapus kelompok varian', { description: res.error })
    }
  }

  const openCreateDialog = () => {
    setSelectedGroup(null)
    setIsReadOnly(false)
    setIsFormOpen(true)
  }

  const openViewDialog = (vg: VariantGroup) => {
    setSelectedGroup(vg)
    setIsReadOnly(true)
    setIsFormOpen(true)
  }

  const openEditDialog = (vg: VariantGroup) => {
    setSelectedGroup(vg)
    setIsReadOnly(false)
    setIsFormOpen(true)
  }

  const openDeleteDialog = (vg: VariantGroup) => {
    setSelectedGroup(vg)
    setIsDeleteOpen(true)
  }

  // Client-side filtering logic
  const filteredGroups = variantGroups.filter((vg) => {
    return vg.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Pagination calculation
  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filteredGroups.length / ITEMS_PER_PAGE)
  const paginatedGroups = filteredGroups.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight text-foreground">Kelompok Varian Produk</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin 
              ? 'Kelola data kelompok payung varian produk (contoh: Ganci Akrilik, Kaos Polo Premium).' 
              : 'Daftar kelompok varian produk dalam sistem.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Tambah Kelompok
          </Button>
        )}
      </div>

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:max-w-xs">
          <Input
            placeholder="Cari kelompok varian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat kelompok varian...</div>
      ) : (
        <div className="flex flex-col gap-4">
          <VariantGroupListTable
            variantGroups={paginatedGroups}
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
      <VariantGroupDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        variantGroup={selectedGroup}
        onSubmit={handleCreateOrUpdate}
        isReadOnly={isReadOnly}
      />
      {isAdmin && (
        <DeleteConfirmDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          variantGroup={selectedGroup}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

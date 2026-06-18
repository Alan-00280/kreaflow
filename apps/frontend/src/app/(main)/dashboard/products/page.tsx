'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useSession } from '@/components/providers/session-provider'
import {
  getProductsAction,
  createProductAction,
  updateProductAction,
  deleteProductAction
} from '@/server/product-actions'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'

import { ProductListTable } from './_components/product-list-table'
import { ProductDialog } from './_components/product-dialog'
import { DeleteConfirmDialog } from './_components/delete-confirm-dialog'

interface Product {
  id: string
  name: string
  basePrice: string
  isActive: boolean
  createdAt: string
}

export default function ProductsPage() {
  const session = useSession()
  const isAdmin = session?.role === 'admin'

  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Search, Filter, and Pagination States
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isReadOnly, setIsReadOnly] = useState(false)

  const fetchProducts = async () => {
    setIsLoading(true)
    const res = await getProductsAction()
    if (res.success && res.products) {
      if (session?.role === 'operator') {
        // Operator RBAC: only see active products
        setProducts(res.products.filter((p: Product) => p.isActive))
      } else {
        setProducts(res.products)
      }
    } else {
      toast.error('Gagal memuat produk', { description: res.error })
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (session) {
      fetchProducts()
    }
  }, [session])

  // Reset page to 1 when search or filter values change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  const handleCreateOrUpdate = async (data: any) => {
    let res
    if (selectedProduct) {
      res = await updateProductAction(selectedProduct.id, data)
    } else {
      res = await createProductAction(data)
    }

    if (res.success) {
      toast.success(selectedProduct ? 'Produk berhasil diperbarui!' : 'Produk baru berhasil dibuat!')
      setIsFormOpen(false)
      fetchProducts()
    } else {
      toast.error('Gagal menyimpan produk', { description: res.error })
    }
  }

  const handleDelete = async () => {
    if (!selectedProduct) return
    const res = await deleteProductAction(selectedProduct.id)
    if (res.success) {
      toast.success('Produk berhasil dihapus!')
      setIsDeleteOpen(false)
      fetchProducts()
    } else {
      toast.error('Gagal menghapus produk', { description: res.error })
    }
  }

  const openCreateDialog = () => {
    setSelectedProduct(null)
    setIsReadOnly(false)
    setIsFormOpen(true)
  }

  const openViewDialog = (product: Product) => {
    setSelectedProduct(product)
    setIsReadOnly(true)
    setIsFormOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product)
    setIsReadOnly(false)
    setIsFormOpen(true)
  }

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product)
    setIsDeleteOpen(true)
  }

  // Client-side filtering logic
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = 
      statusFilter === 'all' 
        ? true 
        : statusFilter === 'active' 
          ? product.isActive 
          : !product.isActive
    return matchesSearch && matchesStatus
  })

  // Pagination calculation
  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Katalog Produk</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin 
              ? 'Kelola data master produk satuan beserta form atribut kustomisasi.' 
              : 'Daftar produk satuan aktif dalam sistem.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} className="flex items-center gap-1">
            <Plus className="h-4 w-4" /> Tambah Produk
          </Button>
        )}
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:max-w-xs">
          <Input
            placeholder="Cari nama produk..."
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
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Non-aktif</option>
            </NativeSelect>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat katalog...</div>
      ) : (
        <div className="flex flex-col gap-4">
          <ProductListTable
            products={paginatedProducts}
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
      <ProductDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        product={selectedProduct}
        onSubmit={handleCreateOrUpdate}
        isReadOnly={isReadOnly}
      />
      {isAdmin && (
        <DeleteConfirmDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          product={selectedProduct}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}


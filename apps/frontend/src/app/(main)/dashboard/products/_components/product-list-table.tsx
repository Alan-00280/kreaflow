'use client'

import { Edit2, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

interface Product {
  id: string
  name: string
  basePrice: string
  isActive: boolean
  createdAt: string
}

interface ProductListTableProps {
  products: Product[]
  isAdmin: boolean
  onView: (product: Product) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export function ProductListTable({ products, isAdmin, onView, onEdit, onDelete }: ProductListTableProps) {
  const formatRupiah = (value: string) => {
    const numeric = parseFloat(value)
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(numeric)
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg bg-card">
        <p className="text-muted-foreground text-sm">Tidak ada produk ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama Produk</TableHead>
            <TableHead className="text-right">Harga Dasar</TableHead>
            <TableHead className="text-center w-24">Status</TableHead>
            <TableHead className="text-center w-36">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id} className="hover:bg-accent/40 transition-colors">
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="text-right">{formatRupiah(product.basePrice)}</TableCell>
              <TableCell className="text-center">
                <Badge 
                  variant={product.isActive ? 'default' : 'secondary'} 
                  className={product.isActive ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20' : 'bg-neutral-500/10 text-neutral-500 hover:bg-neutral-500/10 border border-neutral-500/20'}
                >
                  {product.isActive ? 'Aktif' : 'Non-aktif'}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 hover:text-primary hover:border-primary"
                    onClick={() => onView(product)}
                    type="button"
                    title="Detail Produk"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 hover:text-primary hover:border-primary"
                        onClick={() => onEdit(product)}
                        type="button"
                        title="Ubah Produk"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:border-destructive"
                        onClick={() => onDelete(product)}
                        type="button"
                        title="Hapus Produk"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}


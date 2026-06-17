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

interface Bundle {
  id: string
  name: string
  description: string | null
  bundlePrice: string
  isActive: boolean
  createdAt: string
}

interface BundleListTableProps {
  bundles: Bundle[]
  isAdmin: boolean
  onView: (bundle: Bundle) => void
  onEdit: (bundle: Bundle) => void
  onDelete: (bundle: Bundle) => void
}

export function BundleListTable({ bundles, isAdmin, onView, onEdit, onDelete }: BundleListTableProps) {
  const formatRupiah = (value: string) => {
    const numeric = parseFloat(value)
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(numeric)
  }

  if (bundles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg bg-card">
        <p className="text-muted-foreground text-sm">Tidak ada paket bundling ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama Paket</TableHead>
            <TableHead>Deskripsi</TableHead>
            <TableHead className="text-right w-36">Harga Paket</TableHead>
            <TableHead className="text-center w-24">Status</TableHead>
            <TableHead className="text-center w-36">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bundles.map((bundle) => (
            <TableRow key={bundle.id} className="hover:bg-accent/40 transition-colors">
              <TableCell className="font-medium">{bundle.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                {bundle.description || <span className="italic text-muted-foreground/60">Tidak ada deskripsi</span>}
              </TableCell>
              <TableCell className="text-right">{formatRupiah(bundle.bundlePrice)}</TableCell>
              <TableCell className="text-center">
                <Badge 
                  variant={bundle.isActive ? 'default' : 'secondary'} 
                  className={bundle.isActive ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20' : 'bg-neutral-500/10 text-neutral-500 hover:bg-neutral-500/10 border border-neutral-500/20'}
                >
                  {bundle.isActive ? 'Aktif' : 'Non-aktif'}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 hover:text-primary hover:border-primary"
                    onClick={() => onView(bundle)}
                    type="button"
                    title="Detail Paket"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 hover:text-primary hover:border-primary"
                        onClick={() => onEdit(bundle)}
                        type="button"
                        title="Ubah Paket"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:border-destructive"
                        onClick={() => onDelete(bundle)}
                        type="button"
                        title="Hapus Paket"
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

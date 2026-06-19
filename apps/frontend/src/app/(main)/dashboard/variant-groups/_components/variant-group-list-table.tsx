'use client'

import { Edit2, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

interface VariantGroup {
  id: string
  name: string
  createdAt: string
}

interface VariantGroupListTableProps {
  variantGroups: VariantGroup[]
  isAdmin: boolean
  onView: (vg: VariantGroup) => void
  onEdit: (vg: VariantGroup) => void
  onDelete: (vg: VariantGroup) => void
}

export function VariantGroupListTable({
  variantGroups,
  isAdmin,
  onView,
  onEdit,
  onDelete
}: VariantGroupListTableProps) {
  
  const formatDateTimeString = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
  }

  if (variantGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg bg-card">
        <p className="text-muted-foreground text-sm">Tidak ada kelompok varian ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama Kelompok Varian</TableHead>
            <TableHead>Tanggal Dibuat</TableHead>
            <TableHead className="text-center w-36">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variantGroups.map((vg) => (
            <TableRow key={vg.id} className="hover:bg-accent/40 transition-colors">
              <TableCell className="font-semibold text-foreground">{vg.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{formatDateTimeString(vg.createdAt)}</TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 hover:text-primary hover:border-primary"
                    onClick={() => onView(vg)}
                    type="button"
                    title="Detail Kelompok Varian"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 hover:text-primary hover:border-primary"
                        onClick={() => onEdit(vg)}
                        type="button"
                        title="Ubah Kelompok Varian"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:border-destructive"
                        onClick={() => onDelete(vg)}
                        type="button"
                        title="Hapus Kelompok Varian"
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

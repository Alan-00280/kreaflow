'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

interface VariantGroup {
  id: string
  name: string
  createdAt: string
}

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  variantGroup: VariantGroup | null
  onConfirm: () => Promise<void>
}

export function DeleteConfirmDialog({ isOpen, onClose, variantGroup, onConfirm }: DeleteConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    await onConfirm()
    setIsLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Kelompok Varian</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus kelompok varian <span className="font-semibold text-foreground">"{variantGroup?.name}"</span>?
            <br />
            <br />
            <span className="text-destructive font-medium">Perhatian:</span> Produk yang terhubung dengan kelompok varian ini akan kehilangan relasinya (set ke NULL), namun produknya tidak akan dihapus. Bundling yang merujuk pada kelompok varian ini mungkin perlu diperbarui.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Menghapus...' : 'Hapus Kelompok Varian'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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

interface Bundle {
  id: string
  name: string
  description: string | null
  bundlePrice: string
  isActive: boolean
  createdAt: string
}

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  bundle: Bundle | null
  onConfirm: () => Promise<void>
}

export function DeleteConfirmDialog({ isOpen, onClose, bundle, onConfirm }: DeleteConfirmDialogProps) {
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
          <DialogTitle>Hapus Paket Bundling</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus paket bundling <span className="font-semibold text-foreground">"{bundle?.name}"</span>?
            Tindakan ini tidak dapat dibatalkan dan akan menghapus relasi produk di dalamnya secara permanen.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Menghapus...' : 'Hapus Paket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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

interface Product {
  id: string
  name: string
  basePrice: string
  isActive: boolean
  createdAt: string
}

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onConfirm: () => Promise<void>
}

export function DeleteConfirmDialog({ isOpen, onClose, product, onConfirm }: DeleteConfirmDialogProps) {
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
          <DialogTitle>Hapus Produk</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus produk <span className="font-semibold text-foreground">"{product?.name}"</span>?
            Tindakan ini tidak dapat dibatalkan dan akan menghapus seluruh atribut kustomisasi terkait produk ini secara permanen.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Menghapus...' : 'Hapus Produk'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

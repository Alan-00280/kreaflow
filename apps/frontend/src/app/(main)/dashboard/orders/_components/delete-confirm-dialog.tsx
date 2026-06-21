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

interface Order {
  id: string
  invoiceNumber: string
}

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  order: Order | null
  onConfirm: () => Promise<void>
}

export function DeleteConfirmDialog({ isOpen, onClose, order, onConfirm }: DeleteConfirmDialogProps) {
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
          <DialogTitle>Hapus Nota Pesanan</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus nota pesanan <span className="font-semibold text-foreground">"{order?.invoiceNumber}"</span>?
            Tindakan ini tidak dapat dibatalkan dan akan menghapus seluruh data transaksi, item belanja, beserta spesifikasi kustomisasi yang terkait secara permanen dari sistem.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Menghapus...' : 'Hapus Pesanan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

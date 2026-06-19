'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { getVariantGroupDetailAction } from '@/server/variant-group-actions'

interface VariantGroup {
  id: string
  name: string
  createdAt: string
}

interface VariantProduct {
  id: string
  name: string
  basePrice: string
  isActive: boolean
}

interface VariantGroupDialogProps {
  isOpen: boolean
  onClose: () => void
  variantGroup: VariantGroup | null
  onSubmit: (data: { name: string }) => Promise<void>
  isReadOnly?: boolean
}

export function VariantGroupDialog({
  isOpen,
  onClose,
  variantGroup,
  onSubmit,
  isReadOnly = false
}: VariantGroupDialogProps) {
  const [name, setName] = useState('')
  const [associatedProducts, setAssociatedProducts] = useState<VariantProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (variantGroup) {
        setIsLoading(true)
        setName(variantGroup.name)
        setAssociatedProducts([])
        
        getVariantGroupDetailAction(variantGroup.id).then((res) => {
          if (res.success && res.variantGroup) {
            setAssociatedProducts(res.variantGroup.products || [])
          }
          setIsLoading(false)
        })
      } else {
        setName('')
        setAssociatedProducts([])
        setIsLoading(false)
      }
    }
  }, [isOpen, variantGroup])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly || !name.trim()) return

    setIsLoading(true)
    await onSubmit({ name: name.trim() })
    setIsLoading(false)
  }

  const formatRupiah = (value: string) => {
    const numeric = parseFloat(value)
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(numeric)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleFormSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isReadOnly ? 'Detail Kelompok Varian' : variantGroup ? 'Ubah Kelompok Varian' : 'Tambah Kelompok Varian Baru'}
            </DialogTitle>
          </DialogHeader>

          {isLoading && associatedProducts.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Memuat data...</div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="group-name">Nama Kelompok Varian</Label>
                <Input
                  id="group-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Ganci Akrilik, Kaos Polo Premium"
                  required
                  disabled={isReadOnly}
                />
              </div>

              {variantGroup && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm mb-3">Daftar Varian Produk Konkret Terdaftar</h3>
                  {associatedProducts.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      Belum ada produk satuan konkret yang ditautkan ke kelompok varian ini.
                    </p>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs font-medium">
                          <tr>
                            <th className="p-2 text-left">Nama Produk Varian</th>
                            <th className="p-2 text-right">Harga Dasar</th>
                            <th className="p-2 text-center w-24">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {associatedProducts.map((p) => (
                            <tr key={p.id} className="border-t hover:bg-muted/30">
                              <td className="p-2 font-medium">{p.name}</td>
                              <td className="p-2 text-right">{formatRupiah(p.basePrice)}</td>
                              <td className="p-2 text-center">
                                <Badge 
                                  variant={p.isActive ? 'default' : 'secondary'} 
                                  className={p.isActive ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20 text-[10px] px-1.5 py-0' : 'bg-neutral-500/10 text-neutral-500 hover:bg-neutral-500/10 border border-neutral-500/20 text-[10px] px-1.5 py-0'}
                                >
                                  {p.isActive ? 'Aktif' : 'Non-aktif'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {isReadOnly ? (
              <Button type="button" onClick={onClose}>
                Tutup
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading || name.trim() === ''}>
                  {variantGroup ? 'Simpan Perubahan' : 'Buat Kelompok'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

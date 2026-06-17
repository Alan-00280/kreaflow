'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { getBundleDetailAction } from '@/server/bundle-actions'
import { getProductsAction } from '@/server/product-actions'

interface Bundle {
  id: string
  name: string
  description: string | null
  bundlePrice: string
  isActive: boolean
  createdAt: string
}

interface BundleProductForm {
  productId: string
  quantity: number
  product?: {
    id: string
    name: string
    basePrice: string
    isActive: boolean
  }
}

interface BundleDialogProps {
  isOpen: boolean
  onClose: () => void
  bundle: Bundle | null
  onSubmit: (data: any) => Promise<void>
  isReadOnly?: boolean
}

export function BundleDialog({ isOpen, onClose, bundle, onSubmit, isReadOnly = false }: BundleDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [bundlePrice, setBundlePrice] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [bundleProducts, setBundleProducts] = useState<BundleProductForm[]>([])
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch available products list for selections
  useEffect(() => {
    if (isOpen) {
      getProductsAction().then((res) => {
        if (res.success && res.products) {
          // Only show active products for inclusion in bundles
          setAvailableProducts(res.products.filter((p: any) => p.isActive))
        }
      })
    }
  }, [isOpen])

  // Fetch detail bundle structure
  useEffect(() => {
    if (isOpen) {
      if (bundle) {
        setIsLoading(true)
        setName(bundle.name)
        setDescription(bundle.description || '')
        setBundlePrice(bundle.bundlePrice)
        setIsActive(bundle.isActive)
        
        getBundleDetailAction(bundle.id).then((res) => {
          if (res.success && res.bundle) {
            const fetchedProds = res.bundle.products.map((bp: any) => ({
              productId: bp.productId,
              quantity: bp.quantity,
              product: bp.product
            }))
            setBundleProducts(fetchedProds)
          }
          setIsLoading(false)
        })
      } else {
        setName('')
        setDescription('')
        setBundlePrice('')
        setIsActive(true)
        setBundleProducts([])
        setIsLoading(false)
      }
    }
  }, [isOpen, bundle])

  const handleAddProductRow = () => {
    if (isReadOnly) return
    setBundleProducts([
      ...bundleProducts,
      { productId: '', quantity: 1 }
    ])
  }

  const handleRemoveProductRow = (index: number) => {
    if (isReadOnly) return
    setBundleProducts(bundleProducts.filter((_, i) => i !== index))
  }

  const handleProductRowChange = (index: number, field: keyof BundleProductForm, value: any) => {
    if (isReadOnly) return
    const updated = [...bundleProducts]
    
    if (field === 'productId') {
      const selectedProd = availableProducts.find(p => p.id === value)
      updated[index] = { 
        ...updated[index], 
        productId: value,
        product: selectedProd ? {
          id: selectedProd.id,
          name: selectedProd.name,
          basePrice: selectedProd.basePrice,
          isActive: selectedProd.isActive
        } : undefined
      }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    
    setBundleProducts(updated)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly || !name || !bundlePrice || bundleProducts.length === 0) return

    // Ensure all rows have valid product selections
    const isInvalid = bundleProducts.some(bp => !bp.productId || bp.quantity < 1)
    if (isInvalid) return

    setIsLoading(true)
    
    const formattedProducts = bundleProducts.map((bp) => ({
      productId: bp.productId,
      quantity: bp.quantity
    }))

    const payload = {
      name,
      description: description || undefined,
      bundlePrice: parseFloat(bundlePrice),
      isActive,
      products: formattedProducts
    }

    await onSubmit(payload)
    setIsLoading(false)
  }

  const formatRupiah = (value: string | number) => {
    const numeric = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(numeric)
  }

  // Calculate total price of separate items in bundle for admin visual comparison
  const calculatedIndividualSum = bundleProducts.reduce((sum, bp) => {
    const price = bp.product ? parseFloat(bp.product.basePrice) : 0
    return sum + (price * bp.quantity)
  }, 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleFormSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isReadOnly ? 'Detail Paket Bundling' : bundle ? 'Ubah Paket Bundling' : 'Tambah Paket Bundling Baru'}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Memuat data...</div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="bundle-name">Nama Paket</Label>
                <Input
                  id="bundle-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Paket Hemat Wisuda"
                  required
                  disabled={isReadOnly}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bundle-desc">Deskripsi</Label>
                <Textarea
                  id="bundle-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat mengenai isi paket..."
                  disabled={isReadOnly}
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bundle-price">Harga Paket Khusus (Rp)</Label>
                <Input
                  id="bundle-price"
                  type="number"
                  value={bundlePrice}
                  onChange={(e) => setBundlePrice(e.target.value)}
                  placeholder="Contoh: 150000"
                  required
                  disabled={isReadOnly}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="bundle-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={isReadOnly}
                />
                <Label htmlFor="bundle-active">Status Paket Aktif</Label>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-sm">Produk Satuan Penyusun</h3>
                    {bundleProducts.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Total harga asli satuan: <span className="font-semibold text-foreground">{formatRupiah(calculatedIndividualSum)}</span>
                      </p>
                    )}
                  </div>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddProductRow}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" /> Tambah Produk
                    </Button>
                  )}
                </div>

                {bundleProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">
                    Belum ada produk satuan penyusun terpilih.
                  </p>
                ) : isReadOnly ? (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-muted-foreground text-xs font-medium">
                        <tr>
                          <th className="p-2 text-left">Nama Produk</th>
                          <th className="p-2 text-right">Harga Satuan</th>
                          <th className="p-2 text-center w-24">Kuantitas</th>
                          <th className="p-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bundleProducts.map((bp: any, idx: number) => {
                          const basePriceVal = bp.product ? parseFloat(bp.product.basePrice) : 0
                          const subtotal = basePriceVal * bp.quantity
                          return (
                            <tr key={idx} className="border-t hover:bg-muted/30">
                              <td className="p-2 font-medium">{bp.product?.name || 'Produk Tidak Ditemukan'}</td>
                              <td className="p-2 text-right">{formatRupiah(basePriceVal)}</td>
                              <td className="p-2 text-center">{bp.quantity}</td>
                              <td className="p-2 text-right font-medium">{formatRupiah(subtotal)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bundleProducts.map((bp, idx) => (
                      <div key={idx} className="flex gap-2 p-3 border rounded-lg bg-accent/20 relative items-end">
                        <div className="flex-1">
                          <Label className="text-xs">Produk Satuan</Label>
                          <NativeSelect
                            value={bp.productId}
                            onChange={(e) => handleProductRowChange(idx, 'productId', e.target.value)}
                            required
                          >
                            <NativeSelectOption value="">-- Pilih Produk --</NativeSelectOption>
                            {availableProducts.map((p) => (
                              <NativeSelectOption key={p.id} value={p.id}>
                                {p.name} ({formatRupiah(p.basePrice)})
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </div>

                        <div className="w-24">
                          <Label className="text-xs">Kuantitas</Label>
                          <Input
                            type="number"
                            min="1"
                            value={bp.quantity}
                            onChange={(e) => handleProductRowChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                            required
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProductRow(idx)}
                          className="h-9 w-9 text-destructive border"
                          title="Hapus baris"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                <Button 
                  type="submit" 
                  disabled={
                    isLoading || 
                    name === '' || 
                    bundlePrice === '' || 
                    bundleProducts.length === 0 || 
                    bundleProducts.some(bp => !bp.productId)
                  }
                >
                  {bundle ? 'Simpan Perubahan' : 'Buat Paket'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

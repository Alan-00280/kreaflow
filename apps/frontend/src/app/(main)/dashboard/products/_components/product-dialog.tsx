'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { NativeSelect } from '@/components/ui/native-select'
import { getProductDetailAction } from '@/server/product-actions'
import { getVariantGroupsAction } from '@/server/variant-group-actions'

interface Product {
  id: string
  name: string
  basePrice: string
  isActive: boolean
  createdAt: string
  variantGroupId?: string | null
}

interface AttributeForm {
  attributeName: string
  inputType: 'text' | 'number' | 'option' | 'file'
  isRequired: boolean
  optionsString: string
}

interface ProductDialogProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onSubmit: (data: any) => Promise<void>
  isReadOnly?: boolean
}

export function ProductDialog({ isOpen, onClose, product, onSubmit, isReadOnly = false }: ProductDialogProps) {
  const [name, setName] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [attributes, setAttributes] = useState<AttributeForm[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [variantGroupId, setVariantGroupId] = useState<string>('')
  const [variantGroups, setVariantGroups] = useState<any[]>([])

  useEffect(() => {
    if (isOpen) {
      // Fetch available variant groups
      getVariantGroupsAction().then((res) => {
        if (res.success && res.variantGroups) {
          setVariantGroups(res.variantGroups)
        }
      })

      if (product) {
        setIsLoading(true)
        setName(product.name)
        setBasePrice(product.basePrice)
        setIsActive(product.isActive)
        setVariantGroupId(product.variantGroupId || '')
        
        getProductDetailAction(product.id).then((res) => {
          if (res.success && res.product) {
            const fetchedAttrs = res.product.attributes.map((attr: any) => ({
              attributeName: attr.attributeName,
              inputType: attr.inputType,
              isRequired: attr.isRequired,
              optionsString: attr.options ? attr.options.map((o: any) => o.optionValue).join(', ') : ''
            }))
            setAttributes(fetchedAttrs)
            setVariantGroupId(res.product.variantGroupId || '')
          }
          setIsLoading(false)
        })
      } else {
        setName('')
        setBasePrice('')
        setIsActive(true)
        setAttributes([])
        setVariantGroupId('')
        setIsLoading(false)
      }
    }
  }, [isOpen, product])

  const handleAddAttribute = () => {
    if (isReadOnly) return
    setAttributes([
      ...attributes,
      { attributeName: '', inputType: 'text', isRequired: false, optionsString: '' }
    ])
  }

  const handleRemoveAttribute = (index: number) => {
    if (isReadOnly) return
    setAttributes(attributes.filter((_, i) => i !== index))
  }

  const handleAttributeChange = (index: number, field: keyof AttributeForm, value: any) => {
    if (isReadOnly) return
    const updated = [...attributes]
    updated[index] = { ...updated[index], [field]: value }
    setAttributes(updated)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly || !name || !basePrice) return

    setIsLoading(true)
    
    const formattedAttributes = attributes.map((attr) => ({
      attributeName: attr.attributeName,
      inputType: attr.inputType,
      isRequired: attr.isRequired,
      options: attr.inputType === 'option' 
        ? attr.optionsString.split(',').map(s => s.trim()).filter(Boolean)
        : undefined
    }))

    const payload = {
      name,
      basePrice: parseFloat(basePrice),
      isActive,
      variantGroupId: variantGroupId || null,
      attributes: formattedAttributes
    }

    await onSubmit(payload)
    setIsLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleFormSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isReadOnly ? 'Detail Spesifikasi Produk' : product ? 'Ubah Produk' : 'Tambah Produk Baru'}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Memuat data...</div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="prod-name">Nama Produk</Label>
                <Input
                  id="prod-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Apparel T-Shirt"
                  required
                  disabled={isReadOnly}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="prod-price">Harga Dasar (Rp)</Label>
                <Input
                  id="prod-price"
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="Contoh: 85000"
                  required
                  disabled={isReadOnly}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="prod-variant-group">Kelompok Varian (Opsional)</Label>
                <NativeSelect
                  id="prod-variant-group"
                  value={variantGroupId}
                  onChange={(e) => setVariantGroupId(e.target.value)}
                  disabled={isReadOnly}
                >
                  <option value="">-- Tanpa Kelompok Varian (Produk Standalone) --</option>
                  {variantGroups.map((vg) => (
                    <option key={vg.id} value={vg.id}>
                      {vg.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="prod-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={isReadOnly}
                />
                <Label htmlFor="prod-active">Status Produk Aktif</Label>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-sm">Form Formulir Atribut Kustom</h3>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddAttribute}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" /> Tambah Atribut
                    </Button>
                  )}
                </div>

                {attributes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">
                    Belum ada atribut kustomisasi tambahan.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {attributes.map((attr, idx) => (
                      <div key={idx} className="flex flex-col gap-2 p-3 border rounded-lg bg-accent/20 relative">
                        {!isReadOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAttribute(idx)}
                            className="h-8 w-8 text-destructive absolute top-2 right-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}

                        <div className="grid grid-cols-2 gap-2 pr-10">
                          <div>
                            <Label className="text-xs">Nama Atribut</Label>
                            <Input
                              value={attr.attributeName}
                              onChange={(e) => handleAttributeChange(idx, 'attributeName', e.target.value)}
                              placeholder="Nama field (contoh: Ukuran)"
                              required
                              disabled={isReadOnly}
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Tipe Input</Label>
                            <NativeSelect
                              value={attr.inputType}
                              onChange={(e) => handleAttributeChange(idx, 'inputType', e.target.value)}
                              disabled={isReadOnly}
                            >
                              <option value="text">Teks (String)</option>
                              <option value="number">Angka (Number)</option>
                              <option value="option">Pilihan Ganda (Dropdown)</option>
                              <option value="file">Berkas (File Upload)</option>
                            </NativeSelect>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-1">
                          <label className="flex items-center gap-1 text-xs select-none">
                            <input
                              type="checkbox"
                              checked={attr.isRequired}
                              onChange={(e) => handleAttributeChange(idx, 'isRequired', e.target.checked)}
                              className="rounded border-gray-300"
                              disabled={isReadOnly}
                            />
                            Atribut Wajib Diisi (Required)
                          </label>
                        </div>

                        {attr.inputType === 'option' && (
                          <div className="mt-1">
                            <Label className="text-xs">Pilihan Jawaban (pisahkan dengan koma)</Label>
                            <Input
                              value={attr.optionsString}
                              onChange={(e) => handleAttributeChange(idx, 'optionsString', e.target.value)}
                              placeholder="Contoh: Hitam, Putih, Navy"
                              required
                              disabled={isReadOnly}
                            />
                          </div>
                        )}
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
                <Button type="submit" disabled={isLoading || name === '' || basePrice === ''}>
                  {product ? 'Simpan Perubahan' : 'Buat Produk'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

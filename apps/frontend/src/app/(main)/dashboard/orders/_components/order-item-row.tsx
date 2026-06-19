'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface FormItem {
  id: string
  type: 'product' | 'bundle'
  itemId: string
  quantity: number
  customizations: {
    productId: string
    productName: string
    attributes: any[]
    values: {
      [attributeId: string]: {
        selectedOptionId?: string
        customValue?: string
      }
    }
    isVariantGroup?: boolean
    variantGroupId?: string
    selectedProductId?: string
  }[]
}

interface OrderItemRowProps {
  item: FormItem
  index: number
  availableProducts: any[]
  availableBundles: any[]
  onRemove: (id: string) => void
  onChange: (index: number, field: keyof FormItem, value: any) => void
  onCustomizationChange: (
    rowIdx: number,
    unitIdx: number,
    attributeId: string,
    field: 'selectedOptionId' | 'customValue',
    value: string
  ) => void
  onVariantProductChange: (
    rowIdx: number,
    unitIdx: number,
    selectedProdId: string
  ) => void
}

export function OrderItemRow({
  item,
  index,
  availableProducts,
  availableBundles,
  onRemove,
  onChange,
  onCustomizationChange,
  onVariantProductChange
}: OrderItemRowProps) {
  const formatRupiah = (value: string | number) => {
    const numeric = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(numeric)
  }

  const catalogOptions = item.type === 'product'
    ? availableProducts.map(p => ({
        value: p.id,
        label: p.name,
        description: `Produk Satuan - ${formatRupiah(p.basePrice)}`
      }))
    : availableBundles.map(b => ({
        value: b.id,
        label: b.name,
        description: `Paket Bundling - ${formatRupiah(b.bundlePrice)}`
      }))

  return (
    <div className="p-4 border rounded-lg bg-card space-y-4 shadow-sm relative">
      {/* Remove Row Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.id)}
        className="absolute top-2 right-2 h-8 w-8 text-destructive hover:bg-destructive/10"
        title="Hapus Baris"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-8">
        {/* Item Type */}
        <div className="grid gap-1.5">
          <Label className="text-xs">Tipe Item</Label>
          <NativeSelect
            value={item.type}
            onChange={(e) => onChange(index, 'type', e.target.value)}
          >
            <NativeSelectOption value="product">Produk Satuan</NativeSelectOption>
            <NativeSelectOption value="bundle">Paket Bundling</NativeSelectOption>
          </NativeSelect>
        </div>

        {/* Catalog Selection */}
        <div className="grid gap-1.5 md:col-span-2">
          <Label className="text-xs">Pilihan Katalog</Label>
          <SearchableSelect
            options={catalogOptions}
            value={item.itemId}
            onChange={(val) => onChange(index, 'itemId', val)}
            placeholder="Pilih katalog..."
            searchPlaceholder="Cari nama katalog..."
            emptyMessage="Katalog tidak ditemukan."
          />
        </div>

        {/* Quantity */}
        <div className="grid gap-1.5">
          <Label className="text-xs">Kuantitas (Maks 50)</Label>
          <Input
            type="number"
            min="1"
            max="50"
            value={item.quantity}
            onChange={(e) => onChange(index, 'quantity', e.target.value)}
            required
          />
        </div>
      </div>

      {/* Rendering Customizations */}
      {item.customizations.length > 0 && (
        <div className="border-t pt-3 space-y-3 bg-muted/10 p-3 rounded-lg">
          <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            Formulir Kustomisasi Spesifikasi Item:
          </h4>
          {/* Scrollable list container: caps visibility to max 3 items (approx 480px) and scrolls the rest */}
          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
            {item.customizations.map((cust, uIdx) => {
              const isVariantGroup = cust.isVariantGroup
              const groupProducts = isVariantGroup
                ? availableProducts.filter((p: any) => p.variantGroupId === cust.variantGroupId)
                : []

              return (
                <div key={uIdx} className="bg-background p-3 border rounded-lg space-y-3 shadow-xs">
                  <span className="font-semibold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {cust.productName}
                  </span>
                  
                  {isVariantGroup && (
                    <div className="grid gap-1.5 max-w-md mt-2">
                      <Label className="text-xs font-semibold">Pilih Varian Produk <span className="text-destructive font-bold">*</span></Label>
                      <NativeSelect
                        value={cust.selectedProductId || ''}
                        onChange={(e) => onVariantProductChange(index, uIdx, e.target.value)}
                        required
                      >
                        <NativeSelectOption value="">-- Pilih Varian --</NativeSelectOption>
                        {groupProducts.map((p: any) => (
                          <NativeSelectOption key={p.id} value={p.id}>
                            {p.name} ({formatRupiah(p.basePrice)})
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                  )}

                  {cust.attributes.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      {cust.attributes.map((attr) => (
                        <div key={attr.id} className="grid gap-1">
                          <Label className="text-xs flex items-center gap-1">
                            {attr.attributeName}
                            {attr.isRequired && <span className="text-destructive font-bold">*</span>}
                          </Label>

                          {attr.inputType === 'option' ? (
                            <NativeSelect
                              value={cust.values[attr.id]?.selectedOptionId || ''}
                              onChange={(e) => onCustomizationChange(index, uIdx, attr.id, 'selectedOptionId', e.target.value)}
                              required={attr.isRequired}
                            >
                              <NativeSelectOption value="">-- Pilih Opsi --</NativeSelectOption>
                              {attr.options?.map((opt: any) => (
                                <NativeSelectOption key={opt.id} value={opt.id}>
                                  {opt.optionValue}
                                </NativeSelectOption>
                              ))}
                            </NativeSelect>
                          ) : attr.inputType === 'file' ? (
                            <Input
                              placeholder="Masukkan Tautan URL Berkas (Dropbox/Gdrive)"
                              value={cust.values[attr.id]?.customValue || ''}
                              onChange={(e) => onCustomizationChange(index, uIdx, attr.id, 'customValue', e.target.value)}
                              required={attr.isRequired}
                            />
                          ) : (
                            <Input
                              type={attr.inputType === 'number' ? 'number' : 'text'}
                              placeholder={`Masukkan ${attr.attributeName.toLowerCase()}...`}
                              value={cust.values[attr.id]?.customValue || ''}
                              onChange={(e) => onCustomizationChange(index, uIdx, attr.id, 'customValue', e.target.value)}
                              required={attr.isRequired}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

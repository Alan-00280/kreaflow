'use client'

import { useState, useEffect } from 'react'
import { PlusCircle, Save, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getProductsAction, getProductDetailAction } from '@/server/product-actions'
import { getBundlesAction, getBundleDetailAction } from '@/server/bundle-actions'
import { createOrderAction } from '@/server/order-actions'
import { OrderItemRow } from '../_components/order-item-row'

interface FormItem {
  id: string // unique client-side ID for key mapping
  type: 'product' | 'bundle'
  itemId: string // can be productId or bundleId
  quantity: number
  // customizations array, where index corresponds to the unit index (e.g. unit 0, unit 1, etc.)
  customizations: {
    productId: string
    productName: string
    attributes: any[] // loaded attributes for this product
    values: {
      [attributeId: string]: {
        selectedOptionId?: string
        customValue?: string
      }
    }
  }[]
}

export default function NewOrderPage() {
  const router = useRouter()
  
  // General form inputs
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerGeneration, setCustomerGeneration] = useState('')
  
  // Item list inputs
  const [formItems, setFormItems] = useState<FormItem[]>([])
  
  // Catalog selections
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [availableBundles, setAvailableBundles] = useState<any[]>([])
  
  // Cache of product details to avoid redundant API hits
  const [productDetailsCache, setProductDetailsCache] = useState<{ [id: string]: any }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load catalog selections on mount
  useEffect(() => {
    getProductsAction().then((res) => {
      if (res.success && res.products) {
        setAvailableProducts(res.products.filter((p: any) => p.isActive))
      }
    })
    getBundlesAction().then((res) => {
      if (res.success && res.bundles) {
        setAvailableBundles(res.bundles.filter((b: any) => b.isActive))
      }
    })
  }, [])

  // Auto-generate invoice number if empty, for convenience
  useEffect(() => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randSuffix = Math.floor(100 + Math.random() * 900)
    setInvoiceNumber(`INV-${dateStr}-${randSuffix}`)
  }, [])

  // Helper: Get product details from cache or fetch it
  const fetchProductDetailsWithCache = async (prodId: string) => {
    if (productDetailsCache[prodId]) {
      return productDetailsCache[prodId]
    }
    const res = await getProductDetailAction(prodId)
    if (res.success && res.product) {
      setProductDetailsCache(prev => ({ ...prev, [prodId]: res.product }))
      return res.product
    }
    return null
  }

  // Add new item row to the form
  const handleAddItemRow = () => {
    const newItem: FormItem = {
      id: Math.random().toString(36).substring(7),
      type: 'product',
      itemId: '',
      quantity: 1,
      customizations: []
    }
    setFormItems([...formItems, newItem])
  }

  // Remove item row
  const handleRemoveItemRow = (id: string) => {
    setFormItems(formItems.filter(item => item.id !== id))
  }

  // Recalculate customization forms when quantity or selection changes
  const rebuildCustomizations = async (
    type: 'product' | 'bundle',
    itemId: string,
    quantity: number
  ): Promise<FormItem['customizations']> => {
    if (!itemId) return []

    const customizations: FormItem['customizations'] = []

    if (type === 'product') {
      const product = await fetchProductDetailsWithCache(itemId)
      if (product && product.attributes) {
        // Repeat customization fields for each individual unit
        for (let u = 0; u < quantity; u++) {
          customizations.push({
            productId: product.id,
            productName: product.name,
            attributes: product.attributes,
            values: {}
          })
        }
      }
    } else {
      // Bundle item
      const res = await getBundleDetailAction(itemId)
      if (res.success && res.bundle && res.bundle.products) {
        // A bundle contains multiple constituent products, each with a quantity
        for (const bp of res.bundle.products) {
          const product = await fetchProductDetailsWithCache(bp.productId)
          if (product && product.attributes) {
            // constituent quantity in bundle * quantity of bundle
            const totalUnitsOfProduct = bp.quantity * quantity
            for (let u = 0; u < totalUnitsOfProduct; u++) {
              customizations.push({
                productId: product.id,
                productName: `${product.name} (Unit #${u + 1} di Paket)`,
                attributes: product.attributes,
                values: {}
              })
            }
          }
        }
      }
    }

    return customizations
  }

  // Handler: Change row fields (Type, Selection, Quantity)
  const handleRowChange = async (index: number, field: keyof FormItem, value: any) => {
    const updated = [...formItems]
    const current = updated[index]

    if (field === 'type') {
      current.type = value
      current.itemId = ''
      current.customizations = []
    } else if (field === 'itemId') {
      current.itemId = value
      toast.promise(rebuildCustomizations(current.type, value, current.quantity), {
        loading: 'Memuat struktur atribut kustomisasi...',
        success: (custs) => {
          updated[index].customizations = custs
          setFormItems([...updated])
          return 'Struktur kustomisasi berhasil dimuat!'
        },
        error: 'Gagal memuat kustomisasi'
      })
    } else if (field === 'quantity') {
      const newQty = Math.min(Math.max(parseInt(value) || 1, 1), 50)
      current.quantity = newQty
      if (current.itemId) {
        const custs = await rebuildCustomizations(current.type, current.itemId, newQty)
        current.customizations = custs
        setFormItems([...updated])
      }
    }

    setFormItems(updated)
  }

  // Handler: Change custom attribute value for a specific unit
  const handleCustomizationChange = (
    rowIdx: number,
    unitIdx: number,
    attributeId: string,
    field: 'selectedOptionId' | 'customValue',
    value: string
  ) => {
    const updated = [...formItems]
    const item = updated[rowIdx]
    const cust = item.customizations[unitIdx]
    
    if (!cust.values[attributeId]) {
      cust.values[attributeId] = {}
    }
    
    cust.values[attributeId][field] = value
    setFormItems(updated)
  }

  // Submit Order Creation
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!invoiceNumber || !customerName || formItems.length === 0) {
      toast.error('Harap lengkapi semua field utama dan isi minimal satu item')
      return
    }

    // Validate selections
    const isInvalid = formItems.some(item => !item.itemId)
    if (isInvalid) {
      toast.error('Harap tentukan produk atau paket pada setiap baris item')
      return
    }

    // Check required customizations
    for (let r = 0; r < formItems.length; r++) {
      const row = formItems[r]
      for (let u = 0; u < row.customizations.length; u++) {
        const cust = row.customizations[u]
        for (const attr of cust.attributes) {
          if (attr.isRequired) {
            const val = cust.values[attr.id]
            const hasOption = val?.selectedOptionId !== undefined && val?.selectedOptionId !== ''
            const hasText = val?.customValue !== undefined && val?.customValue !== ''
            if (!hasOption && !hasText) {
              toast.error(`Kustomisasi '${attr.attributeName}' wajib diisi untuk ${cust.productName} pada baris #${r + 1}`)
              return
            }
          }
        }
      }
    }

    setIsSubmitting(true)

    // Expand items with quantity > 1 into separate quantity: 1 entities in payload (FR-13 & FR-14)
    const expandedPayloadItems: any[] = []

    for (const item of formItems) {
      if (item.type === 'product') {
        // Expand product units
        for (let u = 0; u < item.quantity; u++) {
          const cust = item.customizations[u]
          const detailsPayload = Object.entries(cust.values || {}).map(([attrId, val]) => ({
            attributeId: attrId,
            selectedOptionId: val.selectedOptionId || undefined,
            customValue: val.customValue || undefined
          }))

          expandedPayloadItems.push({
            productId: item.itemId,
            bundleId: null,
            quantity: 1, // expanded
            details: detailsPayload
          })
        }
      } else {
        // Expand bundle units
        // Since bundle contains multiple products, for a bundle with quantity M,
        // we send M separate bundle items in the payload, each with quantity 1.
        // We need to map customizations for each product within that bundle unit.
        // E.g. if bundle has Product X (Qty 2) and Product Y (Qty 1), then for bundle unit 'm':
        // customizations array contains Product X (unit 0, 1) and Product Y (unit 0).
        // Let's retrieve constituent products from the bundle details
        const res = await getBundleDetailAction(item.itemId)
        if (res.success && res.bundle && res.bundle.products) {
          for (let m = 0; m < item.quantity; m++) {
            // For this bundle instance, gather customizations of its products
            const bundleDetailsPayload: any[] = []

            // We loop over all customizations belonging to this bundle row
            // and filter only those that correspond to this bundle unit instance 'm'.
            // Product X (Qty Qx) and Product Y (Qty Qy).
            // For bundle instance 'm' (from 0 to M-1):
            // Product X unit indices: m * Qx to (m + 1) * Qx - 1
            // Product Y unit indices: m * Qy to (m + 1) * Qy - 1
            // Let's trace unit index offsets dynamically
            let currentOffset = 0
            for (const bp of res.bundle.products) {
              const qtyInBundle = bp.quantity
              const startIdx = m * qtyInBundle
              const endIdx = startIdx + qtyInBundle

              for (let uIdx = startIdx; uIdx < endIdx; uIdx++) {
                // Find customization record corresponding to product 'bp.productId' at index 'uIdx'
                // Since our rebuildCustomizations list adds customizations product-by-product:
                // product 1 (M * Q1 units), product 2 (M * Q2 units), etc.
                // Product 1 customizations are at index bpOffset + uIdx
                const bpOffset = item.customizations.findIndex(c => c.productId === bp.productId)
                if (bpOffset !== -1) {
                  const targetCust = item.customizations[bpOffset + uIdx]
                  if (targetCust) {
                    Object.entries(targetCust.values || {}).forEach(([attrId, val]) => {
                      bundleDetailsPayload.push({
                        attributeId: attrId,
                        selectedOptionId: val.selectedOptionId || undefined,
                        customValue: val.customValue || undefined
                      })
                    })
                  }
                }
              }
            }

            expandedPayloadItems.push({
              productId: null,
              bundleId: item.itemId,
              quantity: 1, // expanded
              details: bundleDetailsPayload
            })
          }
        }
      }
    }

    const payload = {
      invoiceNumber,
      customerName,
      customerGeneration: customerGeneration ? parseInt(customerGeneration) : null,
      items: expandedPayloadItems
    }

    const res = await createOrderAction(payload)
    setIsSubmitting(false)

    if (res.success) {
      toast.success('Nota pesanan berhasil disimpan ke database!')
      router.push('/dashboard/orders')
    } else {
      toast.error('Gagal menyimpan nota pesanan', { description: res.error })
    }
  }

  const formatRupiah = (value: string | number) => {
    const numeric = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(numeric)
  }

  // Calculate approximate total price for the form summary
  const calculatedTotalSum = formItems.reduce((sum, item) => {
    let price = 0
    if (item.type === 'product' && item.itemId) {
      const prod = availableProducts.find(p => p.id === item.itemId)
      price = prod ? parseFloat(prod.basePrice) : 0
    } else if (item.type === 'bundle' && item.itemId) {
      const bund = availableBundles.find(b => b.id === item.itemId)
      price = bund ? parseFloat(bund.bundlePrice) : 0
    }
    return sum + (price * item.quantity)
  }, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/orders')} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-2xl tracking-tight">Catat Pesanan Baru</h1>
            <p className="text-muted-foreground text-sm">
              Buat nota pesanan baru, input pelanggan baru, dan isi formulir kustomisasi dinamis.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitOrder} className="space-y-6 max-w-4xl">
        {/* Main Details Section */}
        <div className="p-4 border rounded-lg bg-card space-y-4 shadow-sm">
          <h3 className="font-semibold text-sm border-b pb-2">Informasi Transaksi</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invoice">Nomor Invoice</Label>
              <Input
                id="invoice"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-XXXX"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cust-name">Nama Pelanggan</Label>
              <Input
                id="cust-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama Lengkap"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cust-gen">Angkatan / Generasi (opsional)</Label>
              <Input
                id="cust-gen"
                type="number"
                value={customerGeneration}
                onChange={(e) => setCustomerGeneration(e.target.value)}
                placeholder="Contoh: 2024"
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-base">Daftar Item Belanja</h3>
              <p className="text-xs text-muted-foreground">Isi kustomisasi produk satuan atau paket bundling.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow} className="flex items-center gap-1">
              <PlusCircle className="h-4 w-4" /> Tambah Item
            </Button>
          </div>

          {formItems.length === 0 ? (
            <div className="p-8 border border-dashed rounded-lg text-center text-sm text-muted-foreground bg-card">
              Belum ada item belanja ditambahkan. Klik 'Tambah Item' untuk memulai.
            </div>
          ) : (
            <div className="space-y-4">
              {formItems.map((item, idx) => (
                <OrderItemRow
                  key={item.id}
                  item={item}
                  index={idx}
                  availableProducts={availableProducts}
                  availableBundles={availableBundles}
                  onRemove={handleRemoveItemRow}
                  onChange={handleRowChange}
                  onCustomizationChange={handleCustomizationChange}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pricing Summary */}
        <div className="p-4 border rounded-lg bg-card flex justify-between items-center shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Total Estimasi Nilai Nota</p>
            <p className="text-2xl font-bold text-primary">{formatRupiah(calculatedTotalSum)}</p>
          </div>
          <Button type="submit" disabled={isSubmitting || formItems.length === 0} className="flex items-center gap-1.5">
            <Save className="h-4 w-4" /> {isSubmitting ? 'Menyimpan...' : 'Simpan Nota Pesanan'}
          </Button>
        </div>
      </form>
    </div>
  )
}

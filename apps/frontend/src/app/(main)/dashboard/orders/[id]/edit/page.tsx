'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, PlusCircle, Save, ArrowLeft } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { PhoneInput } from '@/components/ui/phone-input'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { getProductsAction, getProductDetailAction } from '@/server/product-actions'
import { getBundlesAction, getBundleDetailAction } from '@/server/bundle-actions'
import { getOrderDetailAction, updateOrderAction } from '@/server/order-actions'
import { getCustomersAction } from '@/server/customer-actions'
import { OrderItemRow } from '../../_components/order-item-row'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

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
    isVariantGroup?: boolean
    variantGroupId?: string
    selectedProductId?: string
  }[]
}

export default function EditOrderPage() {
  const router = useRouter()
  const { id } = useParams()
  
  // General form inputs
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerGeneration, setCustomerGeneration] = useState('')
  const [orderDate, setOrderDate] = useState<Date>(new Date())
  const [customerPhone, setCustomerPhone] = useState('')

  const [availableCustomers, setAvailableCustomers] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('new')
  
  // Item list inputs
  const [formItems, setFormItems] = useState<FormItem[]>([])
  
  // Catalog selections
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [availableBundles, setAvailableBundles] = useState<any[]>([])
  
  // Cache of product details to avoid redundant API hits
  const [productDetailsCache, setProductDetailsCache] = useState<{ [id: string]: any }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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

  // Reconstruct customizations structure for items
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
      const res = await getBundleDetailAction(itemId)
      if (res.success && res.bundle && res.bundle.products) {
        for (const bp of res.bundle.products) {
          if (bp.productId) {
            const product = await fetchProductDetailsWithCache(bp.productId)
            if (product && product.attributes) {
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
          } else if (bp.variantGroupId) {
            const totalUnitsOfVariant = bp.quantity * quantity
            for (let u = 0; u < totalUnitsOfVariant; u++) {
              customizations.push({
                productId: '',
                variantGroupId: bp.variantGroupId,
                isVariantGroup: true,
                productName: `${bp.variantGroup?.name || 'Kelompok Varian'} (Unit #${u + 1} di Paket)`,
                attributes: [],
                values: {},
                selectedProductId: ''
              })
            }
          }
        }
      }
    }

    return customizations
  }

  // Load catalog selections & order data on mount
  useEffect(() => {
    const initData = async () => {
      try {
        // Fetch catalog & customers in parallel
        const [prodRes, bundleRes, custRes] = await Promise.all([
          getProductsAction(),
          getBundlesAction(),
          getCustomersAction()
        ])

        let activeProducts: any[] = []
        if (prodRes.success && prodRes.products) {
          activeProducts = prodRes.products.filter((p: any) => p.isActive)
          setAvailableProducts(activeProducts)
        }
        if (bundleRes.success && bundleRes.bundles) {
          setAvailableBundles(bundleRes.bundles.filter((b: any) => b.isActive))
        }
        
        let loadedCustomers: any[] = []
        if (custRes.success && custRes.customers) {
          loadedCustomers = custRes.customers
          setAvailableCustomers(loadedCustomers)
        }

        // Fetch Order Details
        const orderRes = await getOrderDetailAction(id as string)
        if (orderRes.success && orderRes.order) {
          const order = orderRes.order

          if (order.pickupStatus === 'sudah_diambil') {
            toast.error('Nota pesanan yang sudah diambil tidak dapat diubah')
            router.push('/dashboard/orders')
            return
          }

          setInvoiceNumber(order.invoiceNumber)
          setOrderDate(new Date(order['order-date']))
          
          if (order.customer) {
            setCustomerName(order.customer.name)
            setCustomerPhone(order.customer.phoneNumber || '')
            setCustomerGeneration(order.customer.generation ? order.customer.generation.toString() : '')
            setSelectedCustomerId(order.customerId)

            // Ensure customer is present in option list
            if (!loadedCustomers.some(c => c.id === order.customerId)) {
              setAvailableCustomers(prev => [
                ...prev,
                {
                  id: order.customerId,
                  name: order.customer.name,
                  phoneNumber: order.customer.phoneNumber,
                  generation: order.customer.generation
                }
              ])
            }
          }

          // Map order items from database to frontend state FormItem[]
          const mappedItems: FormItem[] = []
          for (const dbItem of order.items) {
            const type = dbItem.bundleId ? 'bundle' : 'product'
            const itemId = dbItem.bundleId ? dbItem.bundleId : dbItem.productId
            
            const customizations: FormItem['customizations'] = []

            if (type === 'product') {
              const product = await fetchProductDetailsWithCache(itemId)
              if (product && product.attributes) {
                const values: any = {}
                dbItem.details.forEach((det: any) => {
                  values[det.attributeId] = {
                    selectedOptionId: det.selectedOptionId || undefined,
                    customValue: det.customValue || undefined
                  }
                })
                customizations.push({
                  productId: product.id,
                  productName: product.name,
                  attributes: product.attributes,
                  values
                })
              }
            } else {
              // Pre-fetch bundle details
              const resBundle = await getBundleDetailAction(itemId)
              if (resBundle.success && resBundle.bundle && resBundle.bundle.products) {
                for (const bp of resBundle.bundle.products) {
                  if (bp.productId) {
                    const product = await fetchProductDetailsWithCache(bp.productId)
                    if (product && product.attributes) {
                      const values: any = {}
                      dbItem.details.forEach((det: any) => {
                        if (product.attributes.some((attr: any) => attr.id === det.attributeId)) {
                          values[det.attributeId] = {
                            selectedOptionId: det.selectedOptionId || undefined,
                            customValue: det.customValue || undefined
                          }
                        }
                      })
                      customizations.push({
                        productId: product.id,
                        productName: product.name,
                        attributes: product.attributes,
                        values
                      })
                    }
                  } else if (bp.variantGroupId) {
                    // Find variant selection in dbItem.variantSelections
                    const selection = dbItem.variantSelections?.find(
                      (s: any) => s.variantGroupId === bp.variantGroupId
                    )
                    const selectedProductId = selection ? selection.selectedProductId : ''
                    let attributes: any[] = []
                    if (selectedProductId) {
                      const product = await fetchProductDetailsWithCache(selectedProductId)
                      if (product) {
                        attributes = product.attributes || []
                      }
                    }
                    const values: any = {}
                    dbItem.details.forEach((det: any) => {
                      if (attributes.some((attr: any) => attr.id === det.attributeId)) {
                        values[det.attributeId] = {
                          selectedOptionId: det.selectedOptionId || undefined,
                          customValue: det.customValue || undefined
                        }
                      }
                    })
                    customizations.push({
                      productId: selectedProductId,
                      variantGroupId: bp.variantGroupId,
                      isVariantGroup: true,
                      productName: `${bp.variantGroup?.name || 'Kelompok Varian'} (Unit di Paket)`,
                      attributes,
                      values,
                      selectedProductId
                    })
                  }
                }
              }
            }

            mappedItems.push({
              id: Math.random().toString(36).substring(7),
              type,
              itemId,
              quantity: 1, // each row represents a single unit in DB
              customizations
            })
          }
          setFormItems(mappedItems)
        } else {
          toast.error('Gagal memuat detail nota pesanan')
        }
      } catch (err) {
        console.error('Initialization error:', err)
        toast.error('Gagal menginisialisasi form edit')
      } finally {
        setIsLoading(false)
      }
    }

    initData()
  }, [id])

  const handleCustomerSelectChange = (val: string) => {
    setSelectedCustomerId(val)
    if (val === 'new') {
      setCustomerName('')
      setCustomerPhone('')
      setCustomerGeneration('')
    } else {
      const selected = availableCustomers.find(c => c.id === val)
      if (selected) {
        setCustomerName(selected.name)
        setCustomerPhone(selected.phoneNumber || '')
        setCustomerGeneration(selected.generation ? selected.generation.toString() : '')
      }
    }
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
  const handleRemoveItemRow = (rowId: string) => {
    setFormItems(formItems.filter(item => item.id !== rowId))
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

  const handleVariantProductChange = async (
    rowIdx: number,
    unitIdx: number,
    selectedProdId: string
  ) => {
    const updated = [...formItems]
    const item = updated[rowIdx]
    const cust = item.customizations[unitIdx]
    
    cust.selectedProductId = selectedProdId
    cust.productId = selectedProdId
    cust.values = {} // reset values
    
    if (selectedProdId) {
      const product = await fetchProductDetailsWithCache(selectedProdId)
      if (product) {
        cust.attributes = product.attributes || []
      }
    } else {
      cust.attributes = []
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

  // Submit Order Edits
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!invoiceNumber || !customerName || !customerPhone || formItems.length === 0) {
      toast.error('Harap lengkapi semua field utama (termasuk nomor HP/WA) dan isi minimal satu item')
      return
    }

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
        
        if (cust.isVariantGroup && !cust.selectedProductId) {
          toast.error(`Pilihan varian produk wajib diisi untuk '${cust.productName}' pada baris #${r + 1}`)
          return
        }

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
        const res = await getBundleDetailAction(item.itemId)
        if (res.success && res.bundle && res.bundle.products) {
          for (let m = 0; m < item.quantity; m++) {
            const bundleDetailsPayload: any[] = []
            const variantSelectionsPayload: any[] = []

            for (const bp of res.bundle.products) {
              const qtyInBundle = bp.quantity
              const startIdx = m * qtyInBundle
              const endIdx = startIdx + qtyInBundle

              if (bp.productId) {
                for (let uIdx = startIdx; uIdx < endIdx; uIdx++) {
                  const bpOffset = item.customizations.findIndex(c => c.productId === bp.productId && !c.isVariantGroup)
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
              } else if (bp.variantGroupId) {
                for (let uIdx = startIdx; uIdx < endIdx; uIdx++) {
                  const bpOffset = item.customizations.findIndex(c => c.variantGroupId === bp.variantGroupId && c.isVariantGroup)
                  if (bpOffset !== -1) {
                    const targetCust = item.customizations[bpOffset + uIdx]
                    if (targetCust && targetCust.selectedProductId) {
                      variantSelectionsPayload.push({
                        variantGroupId: bp.variantGroupId,
                        selectedProductId: targetCust.selectedProductId
                      })

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
            }

            expandedPayloadItems.push({
              productId: null,
              bundleId: item.itemId,
              quantity: 1, // expanded
              details: bundleDetailsPayload,
              variantSelections: variantSelectionsPayload
            })
          }
        }
      }
    }

    const year = orderDate.getFullYear()
    const month = String(orderDate.getMonth() + 1).padStart(2, '0')
    const day = String(orderDate.getDate()).padStart(2, '0')
    const formattedOrderDate = `${year}-${month}-${day}`

    const payload = {
      invoiceNumber,
      customerName,
      customerPhone,
      customerGeneration: customerGeneration ? parseInt(customerGeneration) : null,
      'order-date': formattedOrderDate,
      items: expandedPayloadItems
    }

    const res = await updateOrderAction(id as string, payload)
    setIsSubmitting(false)

    if (res.success) {
      toast.success('Nota pesanan berhasil diperbarui!')
      router.push('/dashboard/orders')
    } else {
      toast.error('Gagal memperbarui nota pesanan', { description: res.error })
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

  const customerOptions = [
    { value: 'new', label: '++ Pelanggan Baru (Input Manual) ++' },
    ...availableCustomers.map((c) => ({
      value: c.id,
      label: c.name,
      description: [
        c.phoneNumber ? `WA: ${c.phoneNumber}` : null,
        c.generation ? `Angkatan ${c.generation}` : null
      ].filter(Boolean).join(' | ')
    }))
  ]

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center py-24 text-sm text-muted-foreground">
        Memuat data transaksi dan katalog kustomisasi...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/orders')} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-2xl tracking-tight">Edit Nota Pesanan</h1>
            <p className="text-muted-foreground text-sm">
              Perbarui rincian transaksi, data pelanggan, dan form kustomisasi item belanja.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitOrder} className="space-y-6 max-w-4xl">
        {/* Main Details Section */}
        <div className="p-4 border rounded-lg bg-card space-y-4 shadow-sm">
          <h3 className="font-semibold text-sm border-b pb-2">Informasi Transaksi</h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="grid gap-2 md:col-span-6">
              <Label htmlFor="invoice">Nomor Invoice</Label>
              <Input
                id="invoice"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="HIMTI-XXXX"
                required
              />
            </div>
            <div className="grid gap-2 md:col-span-6">
              <Label>Tanggal Transaksi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !orderDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {orderDate ? (
                      new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(orderDate)
                    ) : (
                      <span>Pilih Tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={orderDate}
                    onSelect={(date) => date && setOrderDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Customer Selector Dropdown */}
            <div className="grid gap-2 md:col-span-12">
              <Label>Pilih Pelanggan Terdaftar</Label>
              <SearchableSelect
                options={customerOptions}
                value={selectedCustomerId}
                onChange={handleCustomerSelectChange}
                placeholder="Pilih pelanggan..."
                searchPlaceholder="Cari nama/kontak pelanggan..."
                emptyMessage="Pelanggan tidak ditemukan."
              />
            </div>

            <div className="grid gap-2 md:col-span-5">
              <Label htmlFor="cust-name">Nama Pelanggan</Label>
              <Input
                id="cust-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama Lengkap"
                required
                disabled={selectedCustomerId !== 'new'}
              />
            </div>
            <div className="grid gap-2 md:col-span-4">
              <Label>Nomor HP / WhatsApp</Label>
              <PhoneInput
                value={customerPhone}
                onChange={(val) => setCustomerPhone(val || '')}
                placeholder="Masukkan Nomor HP/WA"
                defaultCountry="ID"
                required
                disabled={selectedCustomerId !== 'new'}
              />
            </div>
            <div className="grid gap-2 md:col-span-3">
              <Label htmlFor="cust-gen">Angkatan / Generasi (opsional)</Label>
              <Input
                id="cust-gen"
                type="number"
                value={customerGeneration}
                onChange={(e) => setCustomerGeneration(e.target.value)}
                placeholder="Contoh: 2024"
                disabled={selectedCustomerId !== 'new'}
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
                  onVariantProductChange={handleVariantProductChange}
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
            <Save className="h-4 w-4" /> {isSubmitting ? 'Menyimpan...' : 'Perbarui Nota Pesanan'}
          </Button>
        </div>
      </form>
    </div>
  )
}

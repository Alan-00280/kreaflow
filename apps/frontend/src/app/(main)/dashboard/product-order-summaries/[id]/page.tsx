'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertTriangle, ChevronDown, CheckCircle, Package, ClipboardCheck, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useSession } from '@/components/providers/session-provider'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  getProductOrderSummaryDetailAction,
  updateSummaryProductsAction,
  exportProductOrderSummaryCsvAction
} from '@/server/product-order-summary-actions'

interface ProductDetail {
  id: string
  name: string
  basePrice: string
}

interface SummaryProductItem {
  id: string
  summaryId: string
  productId: string
  totalQuantity: number
  fulfillmentType: 'pesan_vendor' | 'ambil_stok'
  fulfillmentStatus: string
  product?: ProductDetail
}

interface ProductOrderSummaryDetail {
  id: string
  name: string
  orderStartedDate: string
  orderEndDate: string
  createdAt: string
  summaryProducts: SummaryProductItem[]
}

const statusColors: Record<string, string> = {
  null: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20 hover:bg-zinc-500/15',
  belum_menghubungi_vendor: 'bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 hover:bg-red-500/15',
  menghubungi_vendor: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 hover:bg-amber-500/15',
  diproses_vendor: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 hover:bg-blue-500/15',
  diterima_dari_vendor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 hover:bg-emerald-500/15',
  ambil_di_sekretariat: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20 hover:bg-purple-500/15'
}

const statusLabels: Record<string, string> = {
  null: 'Belum Diproses',
  belum_menghubungi_vendor: 'Belum Menghubungi Vendor',
  menghubungi_vendor: 'Menghubungi Vendor',
  diproses_vendor: 'Diproses oleh Vendor',
  diterima_dari_vendor: 'Diterima dari Vendor',
  ambil_di_sekretariat: 'Ambil di Sekretariat'
}

const typeColors: Record<string, string> = {
  pesan_vendor: 'bg-indigo-500/5 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/5 dark:text-indigo-400 dark:border-indigo-500/20 hover:bg-indigo-500/10',
  ambil_stok: 'bg-orange-500/5 text-orange-600 border-orange-500/20 dark:bg-orange-500/5 dark:text-orange-400 dark:border-orange-500/20 hover:bg-orange-500/10'
}

const typeLabels: Record<string, string> = {
  pesan_vendor: 'Pesan ke Vendor',
  ambil_stok: 'Ambil dari Sekret/Stok'
}

export default function ProductOrderSummaryDetailPage() {
  const session = useSession()
  const router = useRouter()
  const params = useParams()
  const summaryId = params.id as string

  const [summary, setSummary] = useState<ProductOrderSummaryDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Manage dirty changes: productId -> { fulfillmentType, fulfillmentStatus }
  const [edits, setEdits] = useState<Record<string, { fulfillmentType: 'pesan_vendor' | 'ambil_stok'; fulfillmentStatus: string }>>({})

  const fetchDetail = async () => {
    setIsLoading(true)
    const res = await getProductOrderSummaryDetailAction(summaryId)
    if (res.success && res.summary) {
      setSummary(res.summary)
      setEdits({}) // reset edits
    } else {
      toast.error('Gagal memuat detail ringkasan pesanan', { description: res.error })
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (session && summaryId) {
      fetchDetail()
    }
  }, [session, summaryId])

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(d)
  }

  // Handle changes to fulfillment type
  const handleTypeChange = (productId: string, val: 'pesan_vendor' | 'ambil_stok') => {
    const original = summary?.summaryProducts.find((p) => p.productId === productId)
    if (!original) return

    setEdits((prev) => {
      const currentStatus = prev[productId]?.fulfillmentStatus ?? original.fulfillmentStatus
      const isSameAsOriginal = val === original.fulfillmentType && currentStatus === original.fulfillmentStatus

      const updated = { ...prev }
      if (isSameAsOriginal) {
        delete updated[productId]
      } else {
        updated[productId] = {
          fulfillmentType: val,
          fulfillmentStatus: currentStatus
        }
      }
      return updated
    })
  }

  // Handle changes to fulfillment status
  const handleStatusChange = (productId: string, val: string) => {
    const original = summary?.summaryProducts.find((p) => p.productId === productId)
    if (!original) return

    setEdits((prev) => {
      const currentType = prev[productId]?.fulfillmentType ?? original.fulfillmentType
      const isSameAsOriginal = currentType === original.fulfillmentType && val === original.fulfillmentStatus

      const updated = { ...prev }
      if (isSameAsOriginal) {
        delete updated[productId]
      } else {
        updated[productId] = {
          fulfillmentType: currentType,
          fulfillmentStatus: val
        }
      }
      return updated
    })
  }

  // Save changes
  const handleSaveChanges = async () => {
    const payload = Object.entries(edits).map(([productId, val]) => ({
      productId,
      fulfillmentType: val.fulfillmentType,
      fulfillmentStatus: val.fulfillmentStatus
    }))

    if (payload.length === 0) return

    setIsSaving(true)
    const toastId = toast.loading('Menyimpan seluruh perubahan status pemenuhan...')
    const res = await updateSummaryProductsAction(summaryId, payload)
    setIsSaving(false)

    if (res.success) {
      toast.success('Perubahan status berhasil disimpan!', { id: toastId })
      fetchDetail() // reload data to sync
    } else {
      toast.error('Gagal menyimpan perubahan', { id: toastId, description: res.error })
    }
  }

  const handleExportCsv = async (productId: string, productName?: string) => {
    const toastId = toast.loading(`Mengekspor data transaksi ${productName || 'produk'}...`)
    const res = await exportProductOrderSummaryCsvAction(summaryId, productId)

    if (res.success && res.csvText) {
      toast.success('File CSV berhasil diekspor!', { id: toastId })
      
      const blob = new Blob([res.csvText], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `summary-${summaryId}-product-${productId}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else {
      toast.error('Gagal mengekspor data CSV', { id: toastId, description: res.error })
    }
  }

  const hasChanges = Object.keys(edits).length > 0

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Memuat detail pengerjaan ringkasan pesanan...
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Ringkasan pesanan tidak ditemukan atau gagal dimuat.
      </div>
    )
  }

  // Aggregate stats
  const totalUniqueProducts = summary.summaryProducts.length
  const totalItemQuantity = summary.summaryProducts.reduce((sum, sp) => sum + sp.totalQuantity, 0)
  
  const totalPesanVendor = summary.summaryProducts.reduce((sum, sp) => {
    const currentType = edits[sp.productId]?.fulfillmentType ?? sp.fulfillmentType
    return currentType === 'pesan_vendor' ? sum + 1 : sum
  }, 0)

  const totalAmbilStok = summary.summaryProducts.reduce((sum, sp) => {
    const currentType = edits[sp.productId]?.fulfillmentType ?? sp.fulfillmentType
    return currentType === 'ambil_stok' ? sum + 1 : sum
  }, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Back Link */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/product-order-summaries')}
          className="flex items-center gap-1.5 hover:text-primary pl-0"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar
        </Button>
      </div>

      {/* Header and Save Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-bold text-2xl tracking-tight text-foreground">{summary.name}</h1>
            {hasChanges && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-semibold animate-pulse border border-amber-500/20">
                <AlertTriangle className="h-3 w-3" /> Unsaved Changes
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Periode Rentang Transaksi: <span className="font-semibold text-foreground">{formatDateString(summary.orderStartedDate)}</span> s/d <span className="font-semibold text-foreground">{formatDateString(summary.orderEndDate)}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <Button
              variant="outline"
              onClick={() => setEdits({})}
              disabled={isSaving}
              size="sm"
            >
              Reset
            </Button>
          )}
          <Button
            onClick={handleSaveChanges}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-1.5"
            size="sm"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border rounded-xl bg-card space-y-2.5 shadow-xs">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Unik Produk</span>
            <Package className="h-4 w-4 opacity-70" />
          </div>
          <p className="font-bold text-2xl tracking-tight">{totalUniqueProducts} Jenis</p>
        </div>

        <div className="p-4 border rounded-xl bg-card space-y-2.5 shadow-xs">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Kuantitas</span>
            <ClipboardCheck className="h-4 w-4 opacity-70" />
          </div>
          <p className="font-bold text-2xl tracking-tight">{totalItemQuantity} Pcs</p>
        </div>

        <div className="p-4 border rounded-xl bg-card space-y-2.5 shadow-xs">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Pesan Vendor</span>
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
          </div>
          <p className="font-bold text-2xl tracking-tight">{totalPesanVendor} Produk</p>
        </div>

        <div className="p-4 border rounded-xl bg-card space-y-2.5 shadow-xs">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Ambil dari Stok</span>
            <span className="h-2 w-2 rounded-full bg-orange-500" />
          </div>
          <p className="font-bold text-2xl tracking-tight">{totalAmbilStok} Produk</p>
        </div>
      </div>

      {/* Detail Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Nama Produk</TableHead>
              <TableHead className="text-center w-24">Jumlah Kuantitas</TableHead>
              <TableHead className="w-56">Tipe Pemenuhan</TableHead>
              <TableHead className="w-64">Status Pemenuhan</TableHead>
              <TableHead className="text-center w-28">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.summaryProducts.map((sp) => {
              const currentType = edits[sp.productId]?.fulfillmentType ?? sp.fulfillmentType
              const currentStatus = edits[sp.productId]?.fulfillmentStatus ?? sp.fulfillmentStatus

              const isRowEdited = !!edits[sp.productId]

              return (
                <TableRow
                  key={sp.id}
                  className={cn(
                    'hover:bg-accent/30 transition-colors',
                    isRowEdited && 'bg-amber-500/[0.02] border-l-2 border-l-amber-500'
                  )}
                >
                  {/* Product Name */}
                  <TableCell className="font-bold text-foreground py-4">
                    {sp.product?.name || 'Produk Tidak Dikenal'}
                  </TableCell>

                  {/* Accumulated Quantity */}
                  <TableCell className="text-center font-semibold text-primary">
                    {sp.totalQuantity}
                  </TableCell>

                  {/* Fulfillment Type Selection */}
                  <TableCell>
                    <div className="relative w-full">
                      <select
                        value={currentType}
                        onChange={(e) => handleTypeChange(sp.productId, e.target.value as any)}
                        className={cn(
                          'h-9 w-full appearance-none rounded-lg border px-3 pr-8 py-1 text-xs font-medium transition-colors outline-none cursor-pointer',
                          typeColors[currentType] || 'border-input bg-transparent text-foreground'
                        )}
                      >
                        <option value="pesan_vendor" className="bg-popover text-popover-foreground">
                          {typeLabels.pesan_vendor}
                        </option>
                        <option value="ambil_stok" className="bg-popover text-popover-foreground">
                          {typeLabels.ambil_stok}
                        </option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 opacity-60" />
                    </div>
                  </TableCell>

                  {/* Fulfillment Status Selection */}
                  <TableCell>
                    <div className="relative w-full">
                      <select
                        value={currentStatus}
                        onChange={(e) => handleStatusChange(sp.productId, e.target.value)}
                        className={cn(
                          'h-9 w-full appearance-none rounded-lg border px-3 pr-8 py-1 text-xs font-medium transition-colors outline-none cursor-pointer',
                          statusColors[currentStatus] || statusColors.null
                        )}
                      >
                        {Object.entries(statusLabels).map(([statusKey, statusText]) => (
                          <option
                            key={statusKey}
                            value={statusKey}
                            className="bg-popover text-popover-foreground"
                          >
                            {statusText}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 opacity-60" />
                    </div>
                  </TableCell>

                  {/* Export CSV Action */}
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportCsv(sp.productId, sp.product?.name)}
                      className="flex items-center gap-1 mx-auto hover:text-primary hover:border-primary/30 h-8 text-xs"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Ekspor
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

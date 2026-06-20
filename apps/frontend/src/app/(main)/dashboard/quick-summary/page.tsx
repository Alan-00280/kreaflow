'use client'

import { useState } from 'react'
import { Calendar as CalendarIcon, ArrowRight, FileSpreadsheet, Zap, Package, ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  getQuickSummaryAction,
  exportQuickSummaryCsvAction
} from '@/server/quick-summary-actions'

interface QuickSummaryItem {
  productId: string
  productName: string
  basePrice: string
  totalQuantity: number
}

export default function QuickSummaryPage() {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [items, setItems] = useState<QuickSummaryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isExportingId, setIsExportingId] = useState<string | null>(null)

  const getYYYYMMDD = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleCalculate = async () => {
    if (!startDate || !endDate) {
      toast.error('Harap pilih rentang tanggal mulai dan akhir')
      return
    }

    if (startDate > endDate) {
      toast.error('Tanggal mulai tidak boleh melebihi tanggal akhir')
      return
    }

    setIsLoading(true)
    setHasSearched(true)

    const startStr = getYYYYMMDD(startDate)
    const endStr = getYYYYMMDD(endDate)

    const res = await getQuickSummaryAction(startStr, endStr)
    setIsLoading(false)

    if (res.success && res.data) {
      setItems(res.data)
      toast.success('Ringkasan cepat berhasil dihitung!')
    } else {
      toast.error('Gagal menghitung ringkasan cepat', { description: res.error })
    }
  }

  const handleExportCsv = async (productId: string, productName: string) => {
    if (!startDate || !endDate) return

    setIsExportingId(productId)
    const startStr = getYYYYMMDD(startDate)
    const endStr = getYYYYMMDD(endDate)

    const toastId = toast.loading(`Mengekspor data transaksi untuk ${productName}...`)
    const res = await exportQuickSummaryCsvAction(startStr, endStr, productId)
    setIsExportingId(null)

    if (res.success && res.csvText) {
      toast.success('File CSV berhasil diekspor!', { id: toastId })
      
      const blob = new Blob([res.csvText], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `quick-summary-${startStr}-${endStr}-product-${productId}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else {
      toast.error('Gagal mengekspor data CSV', { id: toastId, description: res.error })
    }
  }

  // Aggregate stats
  const totalUniqueProducts = items.length
  const totalItemQuantity = items.reduce((sum, sp) => sum + sp.totalQuantity, 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary fill-primary/10" /> Ringkasan Cepat
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Hitung akumulasi penjualan produk secara real-time berdasarkan rentang tanggal pesanan tanpa menyimpan data ke database.
        </p>
      </div>

      {/* Date Range Selection Panel */}
      <div className="p-5 border rounded-xl bg-card shadow-xs space-y-4 max-w-2xl">
        <h3 className="font-semibold text-sm border-b pb-2">Filter Rentang Tanggal</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Mulai Tanggal</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal text-xs h-10",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? (
                    new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(startDate)
                  ) : (
                    <span>Pilih Tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Sampai Tanggal</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal text-xs h-10",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? (
                    new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(endDate)
                  ) : (
                    <span>Pilih Tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleCalculate} disabled={isLoading} className="flex items-center gap-1.5 px-5">
            {isLoading ? 'Menghitung...' : 'Hitung Ringkasan'} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Sedang menarik transaksi dan menjumlahkan kuantitas produk...
        </div>
      ) : !hasSearched ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg bg-card space-y-3">
          <Zap className="h-10 w-10 text-muted-foreground opacity-50" />
          <div>
            <h3 className="font-semibold text-base">Mulai Agregasi Transaksi</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Tentukan rentang tanggal di atas lalu tekan 'Hitung Ringkasan' untuk menjumlahkan produk terjual.
            </p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg bg-card space-y-3">
          <Package className="h-10 w-10 text-muted-foreground opacity-50" />
          <div>
            <h3 className="font-semibold text-base">Tidak ada transaksi ditemukan</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Tidak ada catatan penjualan produk dalam periode tanggal yang Anda tentukan.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="p-4 border rounded-xl bg-card space-y-2 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Unik Produk</span>
                <p className="font-bold text-2xl tracking-tight mt-1">{totalUniqueProducts} Jenis</p>
              </div>
              <Package className="h-8 w-8 text-primary opacity-20" />
            </div>

            <div className="p-4 border rounded-xl bg-card space-y-2 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Total Kuantitas</span>
                <p className="font-bold text-2xl tracking-tight mt-1">{totalItemQuantity} Pcs</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-primary opacity-20" />
            </div>
          </div>

          {/* Details Table */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/3">Nama Produk</TableHead>
                  <TableHead className="text-center w-36">Kuantitas Terjual</TableHead>
                  <TableHead className="text-center w-32">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((sp) => (
                  <TableRow key={sp.productId} className="hover:bg-accent/30 transition-colors">
                    {/* Product Name */}
                    <TableCell className="font-bold text-foreground py-4">
                      {sp.productName}
                    </TableCell>

                    {/* Accumulated Quantity */}
                    <TableCell className="text-center font-semibold text-primary">
                      {sp.totalQuantity} Pcs
                    </TableCell>

                    {/* Export CSV Action */}
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isExportingId === sp.productId}
                        onClick={() => handleExportCsv(sp.productId, sp.productName)}
                        className="flex items-center gap-1 mx-auto hover:text-primary hover:border-primary/30 h-8 text-xs"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" /> Ekspor
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

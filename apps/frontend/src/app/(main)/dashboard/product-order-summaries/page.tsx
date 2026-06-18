'use client'

import { useState, useEffect } from 'react'
import { PlusCircle, ClipboardList, Calendar as CalendarIcon, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from '@/components/providers/session-provider'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  getProductOrderSummariesAction,
  createProductOrderSummaryAction
} from '@/server/product-order-summary-actions'

interface ProductOrderSummary {
  id: string
  name: string
  orderStartedDate: string
  orderEndDate: string
  createdAt: string
  summaryProducts?: any[]
}

export default function ProductOrderSummariesPage() {
  const session = useSession()
  const router = useRouter()

  const [summaries, setSummaries] = useState<ProductOrderSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Creation dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchSummaries = async () => {
    setIsLoading(true)
    const res = await getProductOrderSummariesAction()
    if (res.success && res.summaries) {
      setSummaries(res.summaries)
    } else {
      toast.error('Gagal memuat daftar ringkasan pesanan', { description: res.error })
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (session) {
      fetchSummaries()
    }
  }, [session])

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(d)
  }

  const formatDateTimeString = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
  }

  const getYYYYMMDD = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleCreateSummary = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !startDate || !endDate) {
      toast.error('Harap lengkapi semua field input')
      return
    }

    if (startDate > endDate) {
      toast.error('Tanggal mulai tidak boleh melebihi tanggal akhir')
      return
    }

    setIsSubmitting(true)
    const startStr = getYYYYMMDD(startDate)
    const endStr = getYYYYMMDD(endDate)

    const res = await createProductOrderSummaryAction({
      name,
      orderStartedDate: startStr,
      orderEndDate: endStr
    })

    setIsSubmitting(false)
    if (res.success) {
      toast.success('Ringkasan pesanan berhasil dibuat!')
      setIsCreateOpen(false)
      // Reset inputs
      setName('')
      setStartDate(undefined)
      setEndDate(undefined)
      // Refresh list
      fetchSummaries()
    } else {
      toast.error('Gagal membuat ringkasan pesanan', { description: res.error })
    }
  }

  const isAdmin = session?.role === 'admin'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Ringkasan Pesanan</h1>
          <p className="text-muted-foreground text-sm">
            Konsolidasikan pesanan pelanggan pada rentang tanggal tertentu untuk pemesanan vendor & stok.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-1.5">
            <PlusCircle className="h-4 w-4" /> Buat Ringkasan
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat data ringkasan pesanan...</div>
      ) : summaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg bg-card space-y-3">
          <ClipboardList className="h-10 w-10 text-muted-foreground opacity-50" />
          <div>
            <h3 className="font-semibold text-base">Belum ada ringkasan pesanan</h3>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Mulai dengan membuat ringkasan pesanan berdasarkan rentang tanggal open PO."
                : "Belum ada ringkasan pesanan yang dicatat oleh Administrator."}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsCreateOpen(true)} size="sm">
              Buat Ringkasan Pertama
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Summary</TableHead>
                <TableHead>Mulai Pesanan</TableHead>
                <TableHead>Akhir Pesanan</TableHead>
                <TableHead>Tanggal Dibuat</TableHead>
                <TableHead className="text-center w-32">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((s) => (
                <TableRow key={s.id} className="hover:bg-accent/40 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/product-order-summaries/${s.id}`)}>
                  <TableCell className="font-semibold text-primary">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDateString(s.orderStartedDate)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDateString(s.orderEndDate)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDateTimeString(s.createdAt)}</TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/product-order-summaries/${s.id}`)}
                      className="flex items-center gap-1 mx-auto hover:text-primary"
                    >
                      Buka Kerja <ArrowRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Buat Ringkasan Pesanan Baru</DialogTitle>
            <DialogDescription>
              Tentukan parameter rentang tanggal untuk mengagregasikan (menjumlahkan) seluruh item pesanan dari histori transaksi.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSummary} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="summary-name">Nama Ringkasan (Summary Name)</Label>
              <Input
                id="summary-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: OPEN PO Merchandise Batch 1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mulai Tanggal</Label>
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
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {startDate ? (
                        new Intl.DateTimeFormat('id-ID', { dateStyle: 'short' }).format(startDate)
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
                <Label>Sampai Tanggal</Label>
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
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {endDate ? (
                        new Intl.DateTimeFormat('id-ID', { dateStyle: 'short' }).format(endDate)
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

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Memproses...' : 'Buat Summary'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

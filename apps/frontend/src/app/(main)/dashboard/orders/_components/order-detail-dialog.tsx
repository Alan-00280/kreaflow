'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { getOrderDetailAction } from '@/server/order-actions'
import { WhatsAppButton } from '@/components/whatsapp-button'
import { Badge } from '@/components/ui/badge'
import { getBundleDetailAction } from '@/server/bundle-actions'

interface OrderDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  orderId: string | null
}

export function OrderDetailDialog({ isOpen, onClose, orderId }: OrderDetailDialogProps) {
  const [order, setOrder] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [bundlesCache, setBundlesCache] = useState<{ [id: string]: any }>({})

  useEffect(() => {
    if (isOpen && orderId) {
      setIsLoading(true)
      getOrderDetailAction(orderId).then(async (res) => {
        if (res.success && res.order) {
          setOrder(res.order)

          // Identify unique bundle IDs in the order
          const bundleIds = Array.from(
            new Set(
              res.order.items
                .filter((item: any) => item.bundleId)
                .map((item: any) => item.bundleId)
            )
          ) as string[]

          // Load bundle details for each unique bundle ID
          const cache: { [id: string]: any } = {}
          await Promise.all(
            bundleIds.map(async (bId) => {
              const bRes = await getBundleDetailAction(bId)
              if (bRes.success && bRes.bundle) {
                cache[bId] = bRes.bundle
              }
            })
          )
          setBundlesCache(cache)
        }
        setIsLoading(false)
      })
    } else {
      setOrder(null)
      setBundlesCache({})
    }
  }, [isOpen, orderId])

  const formatRupiah = (value: string | number) => {
    const numeric = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(numeric)
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'lunas':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">Lunas</Badge>
      case 'belum_lunas':
      default:
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20">Belum Lunas</Badge>
    }
  }

  const getPickupStatusBadge = (status: string) => {
    switch (status) {
      case 'sudah_diambil':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">Sudah Diambil</Badge>
      case 'ditunda':
        return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20 hover:bg-slate-500/20">Ditunda</Badge>
      case 'belum_diambil':
      default:
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">Belum Diambil</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(d)
  }

  const formatOrderDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium'
    }).format(d)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto" style={{maxWidth: "80%"}}>
        <DialogHeader>
          <DialogTitle>Detail Nota Pesanan</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Memuat detail transaksi...</div>
        ) : !order ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Gagal memuat detail transaksi.</div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-accent/10">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Nomor Invoice</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <p className="font-semibold text-lg leading-none">{order.invoiceNumber}</p>
                  {getPaymentStatusBadge(order.paymentStatus)}
                  {getPickupStatusBadge(order.pickupStatus)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tanggal Transaksi: <span className="font-semibold text-foreground">{formatOrderDate(order['order-date'])}</span>
                </p>
                <p className="text-xs text-muted-foreground/85">Dibuat Sistem: {formatDate(order.createdAt)}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Nilai Transaksi</p>
                <p className="font-bold text-lg text-primary">{formatRupiah(order.totalAmount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Customer Info */}
              <div className="p-3 border rounded-lg space-y-2">
                <h4 className="font-medium text-sm border-b pb-1">Data Pelanggan</h4>
                <div className="grid grid-cols-2 text-sm">
                  <span className="text-muted-foreground">Nama:</span>
                  <span className="font-medium text-right">{order.customer?.name || '-'}</span>
                </div>
                <div className="grid grid-cols-2 text-sm">
                  <span className="text-muted-foreground">Angkatan/Generasi:</span>
                  <span className="font-medium text-right">{order.customer?.generation || <span className="italic text-muted-foreground/50">Umum</span>}</span>
                </div>
                <div className="grid grid-cols-2 text-sm">
                  <span className="text-muted-foreground">Nomor HP / WA:</span>
                  <span className="font-medium text-right font-mono text-xs">{order.customer?.phoneNumber || '-'}</span>
                </div>
              </div>

              {/* Staff / Auditor Info */}
              <div className="p-3 border rounded-lg space-y-2">
                <h4 className="font-medium text-sm border-b pb-1">Audit Trail Petugas</h4>
                <div className="grid grid-cols-2 text-sm">
                  <span className="text-muted-foreground">Nama Staff:</span>
                  <span className="font-medium text-right">{order.recordedByUser?.name || '-'}</span>
                </div>
                <div className="grid grid-cols-2 text-sm">
                  <span className="text-muted-foreground">Email / Peran:</span>
                  <span className="font-medium text-right uppercase text-xs">
                    {order.recordedByUser?.role || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* List Items */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Daftar Item Pesanan & Kustomisasi</h4>
              <div className="space-y-3">
                {order.items.map((item: any, idx: number) => {
                  const subtotal = parseFloat(item.priceAtPurchase) * item.quantity
                  const isBundle = !!item.bundleId

                  return (
                    <div key={item.id} className="border rounded-lg overflow-hidden bg-card">
                      {/* Item Header */}
                      <div className="flex justify-between items-center bg-accent/20 px-3 py-2 text-sm font-semibold border-b">
                        <div>
                          <span>Item #{idx + 1} - </span>
                          <span className="text-primary font-bold">
                            {isBundle ? `[Bundling] ${item.bundle?.name}` : item.product?.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground font-normal">{item.quantity} x {formatRupiah(item.priceAtPurchase)} = </span>
                          <span>{formatRupiah(subtotal)}</span>
                        </div>
                      </div>

                      {/* Bundle Products Info */}
                      {isBundle && item.bundleId && bundlesCache[item.bundleId] && (
                        <div className="px-3 py-2 border-b bg-card text-xs text-muted-foreground">
                          <span className="font-semibold block mb-1">Daftar Produk Penyusun Paket:</span>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {bundlesCache[item.bundleId].products?.map((bp: any, bpIdx: number) => {
                              const name = bp.product?.name || bp.variantGroup?.name || 'Produk'
                              return (
                                <li key={bpIdx}>
                                  {name} <span className="font-medium text-foreground">(Kuantitas: {bp.quantity})</span>
                                  {bp.variantGroupId && <span className="text-xs italic ml-1">(Pilihan Varian)</span>}
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}

                      {/* Customization Details */}
                      {item.details && item.details.length > 0 ? (
                        <div className="p-3 bg-muted/20 space-y-2 text-xs">
                          <p className="font-semibold text-muted-foreground uppercase tracking-wider">Kustomisasi Unit:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {item.details.map((det: any) => (
                              <div key={det.id} className="flex flex-col p-2 border rounded bg-background">
                                <span className="text-muted-foreground font-medium">{det.attributeName}</span>
                                <span className="font-semibold text-foreground mt-0.5">
                                  {det.inputType === 'file' ? (
                                    <a
                                      href={det.customValue || '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline font-bold"
                                    >
                                      Buka File Upload ↗
                                    </a>
                                  ) : det.inputType === 'option' ? (
                                    det.selectedOptionValue || '-'
                                  ) : (
                                    det.customValue || '-'
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic p-3 text-center">
                          Tidak ada formulir kustomisasi untuk item ini.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <div>
            {order?.customer?.phoneNumber && (
              <WhatsAppButton phone={order.customer.phoneNumber} name={order.customer.name}>
                Hubungi via WhatsApp
              </WhatsAppButton>
            )}
          </div>
          <Button type="button" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

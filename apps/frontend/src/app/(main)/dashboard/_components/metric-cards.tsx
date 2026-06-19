import { ClipboardList, Layers, Package, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCardsProps {
  totalOrders: number;
  totalSummaries: number;
  totalProducts: number;
  totalBundles: number;
}

export function MetricCards({ totalOrders, totalSummaries, totalProducts, totalBundles }: MetricCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <ShoppingCart className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Total Daftar Pesanan</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {totalOrders.toLocaleString()}
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Pesanan terdaftar di sistem</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <ClipboardList className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Jumlah Ringkasan Pesanan</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {totalSummaries.toLocaleString()}
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Ringkasan konsolidasi vendor</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <Package className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Jumlah Produk</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {totalProducts.toLocaleString()}
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Produk satuan dalam katalog</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <Layers className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Jumlah Bundling</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {totalBundles.toLocaleString()}
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Paket bundling aktif</p>
        </CardContent>
      </Card>
    </div>
  );
}

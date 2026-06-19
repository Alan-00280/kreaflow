"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { getDashboardStatsAction } from "@/server/dashboard-actions";
import { MetricCards } from "./metric-cards";
import { PerformanceOverview } from "./performance-overview";

interface StatsData {
  totalOrders: number;
  totalSummaries: number;
  totalProducts: number;
  totalBundles: number;
}

interface ChartItem {
  label: string;
  count: number;
}

export function DashboardContainer() {
  const [type, setType] = useState<"monthly" | "daily">("monthly");
  const [year, setYear] = useState<string>(() => new Date().getFullYear().toString());
  const [month, setMonth] = useState<string>(() => (new Date().getMonth() + 1).toString());

  const [stats, setStats] = useState<StatsData>({
    totalOrders: 0,
    totalSummaries: 0,
    totalProducts: 0,
    totalBundles: 0,
  });
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await getDashboardStatsAction({ type, year, month });
      if (!res.success) {
        toast.error(res.error || "Gagal memuat statistik");
        return;
      }
      if (res.stats) {
        setStats(res.stats);
      }
      if (res.chartData) {
        setChartData(res.chartData);
      }
    });
  }, [type, year, month]);

  const handleFilterChange = (filters: { type: "monthly" | "daily"; year: string; month: string }) => {
    setType(filters.type);
    setYear(filters.year);
    setMonth(filters.month);
  };

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Absolute Loading Overlay to keep layouts stable and beautiful */}
      {isPending && (
        <div className="absolute inset-0 bg-background/40 backdrop-blur-xs z-50 flex items-center justify-center rounded-xl transition-all duration-300">
          <div className="flex flex-col items-center gap-2 p-4 bg-popover/80 border rounded-xl shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Memperbarui data...</span>
          </div>
        </div>
      )}

      {/* Metric Info cards */}
      <MetricCards
        totalOrders={stats.totalOrders}
        totalSummaries={stats.totalSummaries}
        totalProducts={stats.totalProducts}
        totalBundles={stats.totalBundles}
      />

      {/* Chart Visualization */}
      <PerformanceOverview
        chartData={chartData}
        type={type}
        year={year}
        month={month}
        onChangeFilters={handleFilterChange}
      />
    </div>
  );
}

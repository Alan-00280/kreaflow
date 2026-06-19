"use client";

import { format, parseISO } from "date-fns";
import { Area, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PerformanceOverviewProps {
  chartData: { label: string; count: number }[];
  type: "monthly" | "daily";
  year: string;
  month: string;
  onChangeFilters: (filters: { type: "monthly" | "daily"; year: string; month: string }) => void;
}

const chartConfig = {
  count: {
    label: "Jumlah Pesanan",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const years = ["2024", "2025", "2026", "2027", "2028"];
const months = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export function PerformanceOverview({
  chartData,
  type,
  year,
  month,
  onChangeFilters,
}: PerformanceOverviewProps) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="leading-none">Statistik Volume Pesanan</CardTitle>
        <CardDescription>
          <span>
            {type === "monthly"
              ? `Jumlah volume pesanan bulanan untuk tahun ${year}`
              : `Jumlah volume pesanan harian (3 bulan ke belakang hingga ${months.find((m) => m.value === month)?.label} ${year})`}
          </span>
        </CardDescription>
        <CardAction className="flex flex-wrap items-center gap-2">
          {/* Chart Type Filter */}
          <Select
            value={type}
            onValueChange={(val: "monthly" | "daily") =>
              onChangeFilters({ type: val, year, month })
            }
          >
            <SelectTrigger size="sm" className="w-32">
              <SelectValue placeholder="Tipe Grafik" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Tipe Tampilan</SelectLabel>
                <SelectItem value="monthly">Bulanan (Tahunan)</SelectItem>
                <SelectItem value="daily">Harian (3 Bulan)</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Year Filter */}
          <Select
            value={year}
            onValueChange={(val) => onChangeFilters({ type, year: val, month })}
          >
            <SelectTrigger size="sm" className="w-24">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Tahun</SelectLabel>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Month Filter - Only visible/enabled when type is daily */}
          {type === "daily" && (
            <Select
              value={month}
              onValueChange={(val) => onChangeFilters({ type, year, month: val })}
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue placeholder="Bulan Akhir" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Bulan Akhir</SelectLabel>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </CardAction>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeOpacity={0.5} />

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={type === "monthly" ? 10 : 48}
              tickFormatter={(value) => {
                if (type === "monthly") return value;
                try {
                  const date = parseISO(value);
                  return format(date, "d MMM");
                } catch {
                  return value;
                }
              }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
            />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="w-48"
                  indicator="line"
                  labelFormatter={(value) => {
                    if (type === "monthly") return `Bulan: ${value}`;
                    try {
                      return format(parseISO(value), "d MMMM yyyy");
                    } catch {
                      return value;
                    }
                  }}
                />
              }
            />

            <Area
              dataKey="count"
              type="monotone"
              name="Jumlah Pesanan"
              fill="url(#fillOrders)"
              stroke="var(--color-count)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

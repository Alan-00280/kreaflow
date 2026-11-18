'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PriceRangeFilterProps {
  minPrice: string
  maxPrice: string
  onMinPriceChange: (value: string) => void
  onMaxPriceChange: (value: string) => void
  className?: string
}

export function PriceRangeFilter({
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  className
}: PriceRangeFilterProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="w-28">
        <Input
          type="number"
          min={0}
          placeholder="Min Rp"
          value={minPrice}
          onChange={(e) => onMinPriceChange(e.target.value)}
          className="h-9 text-xs"
        />
      </div>
      <span className="text-muted-foreground text-xs">s/d</span>
      <div className="w-28">
        <Input
          type="number"
          min={0}
          placeholder="Maks Rp"
          value={maxPrice}
          onChange={(e) => onMaxPriceChange(e.target.value)}
          className="h-9 text-xs"
        />
      </div>
    </div>
  )
}

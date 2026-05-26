import { cn } from "@/lib/utils";

interface StockBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
}

export function StockBar({ value, max = 5, showLabel = true }: StockBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const isCritical = pct < 15 || value < 0.5;

  return (
    <div>
      {showLabel && (
        <div className="flex justify-between items-baseline mb-1">
          <span className={cn(
            "font-display text-base font-bold",
            isCritical ? "text-red-500" : "text-gray-900"
          )}>
            {value.toFixed(3).replace(/\.?0+$/, "")} kg
          </span>
        </div>
      )}
      <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isCritical ? "bg-red-400" : "bg-[#F57A28]"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

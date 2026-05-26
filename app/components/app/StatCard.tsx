import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaType?: "up" | "down" | "neutral";
  icon?: string;
}

export function StatCard({ label, value, delta, deltaType, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-orange-100 bg-white p-5">
      <div className="font-mono text-[11px] text-gray-400 mb-2 uppercase tracking-wider">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </div>
      <div className="font-display text-[28px] font-bold leading-none text-gray-900 mb-1">
        {value}
      </div>
      {delta && (
        <div className={cn(
          "font-mono text-[10px] mt-1.5",
          deltaType === "up" && "text-green-600",
          deltaType === "down" && "text-red-500",
          deltaType === "neutral" && "text-gray-400",
        )}>
          {delta}
        </div>
      )}
    </div>
  );
}

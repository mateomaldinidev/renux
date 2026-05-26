import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono border transition-colors focus:outline-none focus:ring-2 focus:ring-[#F57A28] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#F57A28] text-white",
        secondary: "border-transparent bg-orange-50 text-[#F57A28]",
        destructive: "border-transparent bg-red-500 text-white",
        outline: "text-gray-700 border-orange-100",
        ingresado: "bg-amber-50 text-amber-700 border-amber-200",
        preparado: "bg-blue-50 text-blue-700 border-blue-200",
        entregado: "bg-green-50 text-green-700 border-green-200",
        adeudapago: "bg-red-50 text-red-600 border-red-200",
        activo: "bg-green-50 text-green-700 border-green-200",
        inactivo: "bg-gray-100 text-gray-500 border-gray-200",
        stockbajo: "bg-red-50 text-red-600 border-red-200",
        mix: "bg-blue-50 text-blue-700 border-blue-200",
        kg: "bg-orange-50 text-orange-600 border-orange-200",
        unidad: "bg-purple-50 text-purple-700 border-purple-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

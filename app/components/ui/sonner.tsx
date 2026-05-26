import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-orange-100 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:font-mono group-[.toast]:text-sm group-[.toast]:text-gray-400",
          actionButton:
            "group-[.toast]:bg-[#F57A28] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-orange-50 group-[.toast]:text-gray-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

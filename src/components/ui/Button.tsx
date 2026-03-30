import { forwardRef } from "react"
import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type Variant = "primary" | "secondary" | "danger" | "ghost"
type Size = "sm" | "md"

const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950/0",
          "disabled:pointer-events-none disabled:opacity-50",
          size === "md" ? "h-10 px-4 text-sm" : "h-8 px-3 text-xs",
          variant === "primary" &&
            "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 active:bg-indigo-600",
          variant === "secondary" &&
            "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 active:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
          variant === "danger" && "bg-rose-600 text-white shadow-sm hover:bg-rose-500 active:bg-rose-600",
          variant === "ghost" &&
            "bg-transparent text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-700",
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = "Button"

export default Button

import type { SelectHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export default function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60",
        "disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 dark:disabled:bg-zinc-950 dark:disabled:text-zinc-500",
        "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

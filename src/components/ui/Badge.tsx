import { cn } from "@/lib/utils"

export default function Badge({
  className,
  tone = "zinc",
  children,
}: {
  className?: string
  tone?: "zinc" | "indigo" | "rose" | "emerald"
  children: React.ReactNode
}) {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
  const tones = {
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
  } as const
  return <span className={cn(base, tones[tone], className)}>{children}</span>
}


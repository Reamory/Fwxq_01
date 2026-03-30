import { cn } from "@/lib/utils"

export default function Card({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white shadow-sm",
        "dark:border-zinc-900 dark:bg-zinc-950",
        className,
      )}
    >
      {children}
    </div>
  )
}


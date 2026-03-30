import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Chip({
  label,
  onRemove,
  className,
}: {
  label: string
  onRemove?: () => void
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700",
        "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200",
        className,
      )}
    >
      {label}
      {onRemove ? (
        <button
          className="rounded-full p-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900"
          onClick={onRemove}
          aria-label="移除"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </span>
  )
}


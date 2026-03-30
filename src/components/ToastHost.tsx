import { X } from "lucide-react"
import Button from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { useToastStore } from "@/store/toast"

export default function ToastHost() {
  const items = useToastStore((s) => s.items)
  const remove = useToastStore((s) => s.remove)

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto rounded-xl border bg-white p-3 shadow-lg",
            "dark:border-zinc-800 dark:bg-zinc-950",
            t.tone === "success" && "border-emerald-200 dark:border-emerald-500/20",
            t.tone === "danger" && "border-rose-200 dark:border-rose-500/20",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t.title}</div>
              {t.description ? (
                <div className="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-300">{t.description}</div>
              ) : null}
              {t.actionLabel && t.onAction ? (
                <button
                  className="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300"
                  onClick={() => {
                    t.onAction?.()
                    remove(t.id)
                  }}
                >
                  {t.actionLabel}
                </button>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 p-0"
              onClick={() => remove(t.id)}
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}


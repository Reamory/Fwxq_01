import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import Button from "@/components/ui/Button"

export default function Dialog({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  className,
}: {
  open: boolean
  title: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  onClose: () => void
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
        aria-label="关闭弹窗"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full max-w-[560px] rounded-2xl border border-zinc-200 bg-white shadow-xl",
          "dark:border-zinc-900 dark:bg-zinc-950",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-900">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{title}</div>
            {description ? <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{description}</div> : null}
          </div>
          <Button variant="ghost" className="h-9 w-9 p-0" onClick={onClose} aria-label="关闭">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {children ? <div className="px-5 py-4">{children}</div> : null}

        {footer ? <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-900">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}


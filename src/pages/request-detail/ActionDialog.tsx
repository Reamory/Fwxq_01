import { useEffect, useState } from "react"
import Dialog from "@/components/ui/Dialog"
import Button from "@/components/ui/Button"

export default function ActionDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant,
  opinion,
  opinionLabel,
  opinionPlaceholder,
  opinionRequired,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  confirmVariant: "primary" | "secondary" | "danger"
  opinion?: { value: string; setValue: (v: string) => void }
  opinionLabel?: string
  opinionPlaceholder?: string
  opinionRequired?: boolean
  onConfirm: () => Promise<void> | void
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) setBusy(false)
  }, [open])

  const canConfirm = !opinion || !opinionRequired || opinion.value.trim().length > 0

  return (
    <Dialog
      open={open}
      title={title}
      description={description}
      onClose={() => {
        if (busy) return
        onClose()
      }}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              if (busy) return
              onClose()
            }}
          >
            取消
          </Button>
          <Button
            variant={confirmVariant}
            disabled={!canConfirm || busy}
            onClick={async () => {
              if (!canConfirm) return
              setBusy(true)
              try {
                await onConfirm()
              } finally {
                setBusy(false)
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {opinion ? (
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {opinionLabel || "处理意见"}
            {opinionRequired ? "*" : ""}
          </label>
          <textarea
            className={
              "mt-2 min-h-[96px] w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm " +
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 " +
              "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            }
            value={opinion.value}
            onChange={(e) => opinion.setValue(e.target.value)}
            placeholder={opinionPlaceholder}
          />
        </div>
      ) : (
        <div className="text-sm text-zinc-700 dark:text-zinc-200">确认执行该操作？</div>
      )}
    </Dialog>
  )
}


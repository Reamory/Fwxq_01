import { create } from "zustand"

export type ToastTone = "default" | "success" | "danger"

export type ToastItem = {
  id: string
  title: string
  description?: string
  tone: ToastTone
  actionLabel?: string
  onAction?: () => void
  createdAt: number
  ttlMs: number
}

type ToastState = {
  items: ToastItem[]
  push: (toast: Omit<ToastItem, "id" | "createdAt">) => void
  remove: (id: string) => void
  clear: () => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (t) => {
    const id = globalThis.crypto.randomUUID()
    const toast: ToastItem = { ...t, id, createdAt: Date.now() }
    set((s) => ({ items: [toast, ...s.items].slice(0, 4) }))
    window.setTimeout(() => {
      get().remove(id)
    }, toast.ttlMs)
  },
  remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
  clear: () => set({ items: [] }),
}))

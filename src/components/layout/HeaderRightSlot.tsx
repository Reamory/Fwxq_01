import { createPortal } from "react-dom"

export default function HeaderRightSlot({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null
  const el = document.getElementById("app_header_right")
  if (!el) return null
  return createPortal(children, el)
}


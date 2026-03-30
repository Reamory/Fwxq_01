import { createPortal } from "react-dom"

export default function RightAsideSlot({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null
  const el = document.getElementById("app_right_aside")
  if (!el) return null
  return createPortal(children, el)
}


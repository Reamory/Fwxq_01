import { cn } from "@/lib/utils"

export default function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-zinc-200 dark:bg-zinc-900", className)} />
}


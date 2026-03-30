import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import StatusBadge from "@/components/StatusBadge"
import { api } from "@/utils/api"
import { useSessionStore } from "@/store/session"
import { useToastStore } from "@/store/toast"
import type { ServiceRequestRecord } from "../../shared/serviceRequest"
import { BellDot, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CornerDownLeft, ListTodo } from "lucide-react"

type NotificationItem = {
  id: string
  kind: "todo" | "done"
  title: string
  request: ServiceRequestRecord
  ts: string
}

export default function InboxPage() {
  const user = useSessionStore((s) => s.user)
  const pushToast = useToastStore((s) => s.push)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<{ all: number; todo: number; done: number } | null>(null)
  const [tab, setTab] = useState<"all" | "todo" | "done">("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total])
  const canPrev = page > 1
  const canNext = page < totalPages

  const [jump, setJump] = useState("1")
  useEffect(() => {
    setJump(String(page))
  }, [page])

  useEffect(() => {
    setPage(1)
  }, [tab, user.id])

  useEffect(() => {
    let canceled = false
    const run = async () => {
      setLoading(true)
      const res = await api.get<{ items: NotificationItem[]; total: number; counts: { all: number; todo: number; done: number } }>(
        "/api/requests/inbox",
        { tab, page: String(page), pageSize: String(pageSize) },
        { user },
      )

      if (canceled) return
      if (res.success === false) {
        pushToast({ title: "加载站内信失败", description: String(res.error), tone: "danger", ttlMs: 3500 })
        setItems([])
        setTotal(0)
        setCounts(null)
        setLoading(false)
        return
      }

      setItems(res.data.items)
      setTotal(res.data.total)
      setCounts(res.data.counts)
      setLoading(false)
    }

    run()
    return () => {
      canceled = true
    }
  }, [page, pageSize, pushToast, tab, user])

  const allCount = counts?.all ?? 0
  const todoCount = counts?.todo ?? 0
  const doneCount = counts?.done ?? 0

  return (
    <div className="mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-semibold tracking-tight">站内信</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">与你相关的待办与关键状态变更</div>
        </div>
        <Button variant="ghost" onClick={() => window.location.reload()} aria-label="刷新">
          刷新
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <TabButton active={tab === "all"} onClick={() => setTab("all")} label="全部" count={allCount} />
        <TabButton active={tab === "todo"} onClick={() => setTab("todo")} label="待办" count={todoCount} />
        <TabButton
          active={tab === "done"}
          onClick={() => setTab("done")}
          label="完成"
          count={doneCount}
          disabled={user.role !== "business"}
        />
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-900">通知流</div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-900">
          {loading ? (
            <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">加载中…</div>
          ) : tab === "done" && user.role !== "business" ? (
            <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">完成通知仅对业务方展示</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">暂无通知</div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                onClick={() => navigate(`/requests/${n.request.id}`)}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-200">
                  {n.kind === "todo" ? (
                    n.request.status === "rejected" ? (
                      <BellDot className="h-5 w-5" />
                    ) : (
                      <ListTodo className="h-5 w-5" />
                    )
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-medium">{n.title}</div>
                    <div className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{formatRelative(n.ts)}</div>
                  </div>
                  <div className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {n.request.requestNo} · {n.request.projectName}
                  </div>
                </div>

                <div className="shrink-0">
                  <StatusBadge status={n.request.status} />
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/70 px-4 py-2 text-sm dark:border-zinc-900">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="tabular-nums">{total}</span>
            <span>·</span>
            <span className="tabular-nums">
              {page}/{totalPages}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-lg border border-zinc-200/70 bg-white/60 px-2 text-xs text-zinc-700 dark:border-zinc-800/70 dark:bg-zinc-950/40 dark:text-zinc-200"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>

            <Button
              variant="ghost"
              className="h-9 w-9 border border-zinc-200/70 bg-white/60 p-0 text-zinc-700 hover:bg-zinc-100/70 active:bg-zinc-100 dark:border-zinc-800/70 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/50"
              disabled={!canPrev}
              onClick={() => setPage(1)}
              aria-label="首页"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="h-9 w-9 border border-zinc-200/70 bg-white/60 p-0 text-zinc-700 hover:bg-zinc-100/70 active:bg-zinc-100 dark:border-zinc-800/70 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/50"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="上一页"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <input
                className="h-9 w-16 rounded-lg border border-zinc-200/70 bg-white/60 px-2 text-center text-xs tabular-nums text-zinc-700 dark:border-zinc-800/70 dark:bg-zinc-950/40 dark:text-zinc-200"
                value={jump}
                inputMode="numeric"
                onChange={(e) => setJump(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return
                  const next = Math.min(totalPages, Math.max(1, Number.parseInt(jump || "1", 10) || 1))
                  setPage(next)
                }}
              />
              <Button
                variant="ghost"
                className="h-9 w-9 border border-zinc-200/70 bg-white/60 p-0 text-zinc-700 hover:bg-zinc-100/70 active:bg-zinc-100 dark:border-zinc-800/70 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/50"
                onClick={() => {
                  const next = Math.min(totalPages, Math.max(1, Number.parseInt(jump || "1", 10) || 1))
                  setPage(next)
                }}
                aria-label="跳转"
              >
                <CornerDownLeft className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              className="h-9 w-9 border border-zinc-200/70 bg-white/60 p-0 text-zinc-700 hover:bg-zinc-100/70 active:bg-zinc-100 dark:border-zinc-800/70 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/50"
              disabled={!canNext}
              onClick={() => setPage((p) => p + 1)}
              aria-label="下一页"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="h-9 w-9 border border-zinc-200/70 bg-white/60 p-0 text-zinc-700 hover:bg-zinc-100/70 active:bg-zinc-100 dark:border-zinc-800/70 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/50"
              disabled={!canNext}
              onClick={() => setPage(totalPages)}
              aria-label="末页"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  count,
  disabled,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  disabled?: boolean
}) {
  return (
    <button
      className={
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition " +
        (disabled
          ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-900 dark:bg-zinc-950 dark:text-zinc-600"
          : active
            ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900")
      }
      onClick={() => {
        if (disabled) return
        onClick()
      }}
      type="button"
    >
      <span>{label}</span>
      <span className={"rounded-full px-2 py-0.5 text-xs " + (active ? "bg-white/15 text-white dark:bg-zinc-900 dark:text-zinc-50" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-200")}>
        {count}
      </span>
    </button>
  )
}

function formatRelative(ts: string) {
  const t = new Date(ts).getTime()
  if (!Number.isFinite(t)) return ""
  const diff = Date.now() - t
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "刚刚"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  return `${day} 天前`
}

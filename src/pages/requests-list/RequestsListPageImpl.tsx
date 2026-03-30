import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Columns3, CornerDownLeft, RefreshCw } from "lucide-react"
import { createPortal } from "react-dom"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import { api } from "@/utils/api"
import { useSessionStore } from "@/store/session"
import { useToastStore } from "@/store/toast"
import type { ServiceRequestRecord } from "../../../shared/serviceRequest"
import RequestsFilters from "./RequestsFilters"
import RequestsTable from "./RequestsTable"
import type { ColumnId } from "./RequestsTable"
import { viewMeta } from "./viewMeta"
import type { RequestsListFilters, RequestsListView } from "./types"

const emptyFilters = (): RequestsListFilters => ({
  q: "",
  status: "",
  company: "",
  department: "",
  projectType: "",
  procurementMethod: "",
  needDateFrom: "",
  needDateTo: "",
})

export default function RequestsListPageImpl({ view }: { view: RequestsListView }) {
  const user = useSessionStore((s) => s.user)
  const pushToast = useToastStore((s) => s.push)
  const location = useLocation()
  const navigate = useNavigate()

  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ServiceRequestRecord[]>([])
  const [filters, setFilters] = useState<RequestsListFilters>(() => emptyFilters())
  const [appliedFilters, setAppliedFilters] = useState<RequestsListFilters>(() => emptyFilters())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const defaultColumns = useMemo((): ColumnId[] => {
    return ["requestNo", "projectName", "createdByName", "org", "procurementMethod", "needDate", "status"]
  }, [])

  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(defaultColumns)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const columnsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const columnsMenuRef = useRef<HTMLDivElement | null>(null)
  const columnsMenuId = useMemo(() => `sr_columns_menu_${view}`, [view])
  const [columnsMenuPos, setColumnsMenuPos] = useState<{
    top: number
    left: number
    maxHeight: number
    placement: "top" | "bottom"
    anchorX: number
  }>({ top: 0, left: 0, maxHeight: 0, placement: "bottom" })

  const computeColumnsMenuPos = useCallback(
    (
      rect: DOMRect,
      menu: {
        width: number
        height: number
      },
    ) => {
      const margin = 8
      const vw = typeof window === "undefined" ? 0 : window.innerWidth
      const vh = typeof window === "undefined" ? 0 : window.innerHeight

      const width = menu.width
      const height = Math.max(0, menu.height)
      const anchorX = rect.left + rect.width / 2

      const left = Math.min(Math.max(margin, rect.right - width), Math.max(margin, vw - width - margin))

      const spaceBelow = Math.max(0, vh - rect.bottom - margin)
      const spaceAbove = Math.max(0, rect.top - margin)
      const shouldFlip = height > 0 ? spaceBelow < height && spaceAbove > spaceBelow : spaceBelow < 180 && spaceAbove > spaceBelow

      const placement: "top" | "bottom" = shouldFlip ? "top" : "bottom"
      const top = placement === "bottom" ? rect.bottom + margin : Math.max(margin, rect.top - margin - height)
      const available = placement === "bottom" ? spaceBelow : spaceAbove
      const maxHeight = Math.min(360, Math.max(160, available))

      return { top, left, maxHeight, placement, anchorX }
    },
    [],
  )

  const updateColumnsMenuPos = useCallback(() => {
    const trigger = columnsTriggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const menuRect = columnsMenuRef.current?.getBoundingClientRect()
    const width = menuRect?.width ?? 240
    const height = menuRect?.height ?? 0
    setColumnsMenuPos(computeColumnsMenuPos(rect, { width, height }))
  }, [computeColumnsMenuPos])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`sr_cols_${view}`)
      if (!raw) {
        setVisibleColumns(defaultColumns)
        return
      }
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        setVisibleColumns(defaultColumns)
        return
      }
      const allow: ColumnId[] = ["requestNo", "projectName", "createdByName", "org", "procurementMethod", "needDate", "status"]
      const next = parsed.filter((x) => allow.includes(x)) as ColumnId[]
      setVisibleColumns(next.length ? next : defaultColumns)
    } catch {
      setVisibleColumns(defaultColumns)
    }
  }, [defaultColumns, view])

  useEffect(() => {
    try {
      localStorage.setItem(`sr_cols_${view}`, JSON.stringify(visibleColumns))
    } catch {
      void 0
    }
  }, [view, visibleColumns])

  useEffect(() => {
    if (!columnsOpen) return
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (columnsMenuRef.current?.contains(target) || columnsTriggerRef.current?.contains(target as Node)) return
      setColumnsOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [columnsOpen])

  useLayoutEffect(() => {
    if (!columnsOpen) return
    updateColumnsMenuPos()
  }, [columnsOpen, updateColumnsMenuPos])

  useEffect(() => {
    if (!columnsOpen) return
    let raf = 0
    const onReposition = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => updateColumnsMenuPos())
    }
    window.addEventListener("resize", onReposition)
    document.addEventListener("scroll", onReposition, true)
    return () => {
      window.removeEventListener("resize", onReposition)
      document.removeEventListener("scroll", onReposition, true)
      cancelAnimationFrame(raf)
    }
  }, [columnsOpen, updateColumnsMenuPos])

  const filtersRef = useRef(filters)
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  const appliedRef = useRef<RequestsListFilters>(filters)
  useEffect(() => {
    appliedRef.current = appliedFilters
  }, [appliedFilters])
  const pageRef = useRef({ page, pageSize })
  useEffect(() => {
    pageRef.current = { page, pageSize }
  }, [page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [view, user.id])

  const load = useCallback(async () => {
    setLoading(true)
    const f = appliedRef.current
    const p = pageRef.current
    const res = await api.get<{ items: ServiceRequestRecord[]; total: number }>(
      "/api/requests",
      {
        view,
        page: String(p.page),
        pageSize: String(p.pageSize),
        q: f.q || undefined,
        status: f.status || undefined,
        company: f.company || undefined,
        department: f.department || undefined,
        projectType: f.projectType || undefined,
        procurementMethod: f.procurementMethod || undefined,
        needDateFrom: f.needDateFrom || undefined,
        needDateTo: f.needDateTo || undefined,
      },
      { user },
    )
    if (res.success === false) {
      pushToast({ title: "加载失败", description: String(res.error), tone: "danger", ttlMs: 3500 })
      setItems([])
      setTotal(0)
      setLoading(false)
      return
    }
    setItems(res.data.items)
    setTotal(res.data.total)
    setLoading(false)
  }, [pushToast, user, view])

  const applyFilters = useCallback(
    (next: RequestsListFilters) => {
      setFilters(() => next)
      setAppliedFilters(() => next)
      appliedRef.current = next
      pageRef.current = { page: 1, pageSize: pageRef.current.pageSize }
      setPage(1)
      load()
    },
    [load],
  )

  useEffect(() => {
    load()
  }, [load, page, pageSize])

  const meta = viewMeta[view]

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize))
  }, [pageSize, total])

  const canPrev = page > 1
  const canNext = page < totalPages

  const [jump, setJump] = useState("1")
  useEffect(() => {
    setJump(String(page))
  }, [page])

  const onOpen = (id: string) => {
    sessionStorage.setItem("sr_last_list_url", `${location.pathname}${location.search}`)
    navigate(`/requests/${id}`)
  }

  return (
    <div className="mx-auto w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-semibold tracking-tight">{meta.title}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={load} aria-label="刷新">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        <RequestsFilters
          view={view}
          filters={filters}
          appliedFilters={appliedFilters}
          setFilters={setFilters}
          expanded={expanded}
          setExpanded={setExpanded}
          onSearch={(next) => {
            applyFilters(next ?? filtersRef.current)
          }}
          onReset={() => {
            const next = emptyFilters()
            applyFilters(next)
          }}
        />
        <RequestsTable
          loading={loading}
          items={items}
          onOpen={onOpen}
          visibleColumns={visibleColumns}
          columnsControl={
            <div className="relative" data-columns-menu>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                ref={columnsTriggerRef}
                onClick={() => {
                  setColumnsOpen((s) => {
                    const next = !s
                    if (next) updateColumnsMenuPos()
                    return next
                  })
                }}
                aria-label="自定义表头"
                aria-haspopup="menu"
                aria-expanded={columnsOpen}
                aria-controls={columnsMenuId}
                data-columns-trigger
              >
                <Columns3 className="h-4 w-4" />
              </Button>

              {columnsOpen && typeof document !== "undefined"
                ? createPortal(
                    <div
                      ref={columnsMenuRef}
                      id={columnsMenuId}
                      role="menu"
                      className="fixed z-[1000] w-[240px] overflow-y-auto rounded-2xl border border-zinc-200/70 bg-white/90 p-2 text-xs shadow-lg backdrop-blur dark:border-zinc-900/70 dark:bg-zinc-950/80"
                      style={{ top: columnsMenuPos.top, left: columnsMenuPos.left, maxHeight: columnsMenuPos.maxHeight }}
                      data-columns-menu
                    >
                      <div
                        className={
                          "pointer-events-none absolute h-3 w-3 rotate-45 border border-zinc-200/70 bg-white/90 shadow-sm dark:border-zinc-900/70 dark:bg-zinc-950/80 " +
                          (columnsMenuPos.placement === "bottom" ? "-top-1.5" : "-bottom-1.5")
                        }
                        style={{ left: Math.min(240 - 18, Math.max(18, columnsMenuPos.anchorX - columnsMenuPos.left - 6)) }}
                      />
                      {(
                        [
                          { id: "requestNo", label: "需求编号" },
                          { id: "projectName", label: "项目名称" },
                          { id: "createdByName", label: "提交人" },
                          { id: "org", label: "公司/部门" },
                          { id: "procurementMethod", label: "采购方式" },
                          { id: "needDate", label: "需求时间" },
                          { id: "status", label: "状态" },
                        ] as { id: ColumnId; label: string }[]
                      ).map((c) => {
                        const checked = visibleColumns.includes(c.id)
                        return (
                          <label
                            key={c.id}
                            className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-100/70 dark:text-zinc-200 dark:hover:bg-zinc-900/50"
                          >
                            <span>{c.label}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setVisibleColumns((prev) => {
                                  if (checked) {
                                    const next = prev.filter((x) => x !== c.id)
                                    return next.length ? next : prev
                                  }
                                  return [...prev, c.id]
                                })
                              }}
                            />
                          </label>
                        )
                      })}
                    </div>,
                    document.body,
                  )
                : null}
            </div>
          }
        />

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

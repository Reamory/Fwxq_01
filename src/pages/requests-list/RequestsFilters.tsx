import { CalendarDays, Filter, Search } from "lucide-react"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import Select from "@/components/ui/Select"
import Chip from "@/components/ui/Chip"
import type { ProcurementMethod, ProjectType } from "../../../shared/serviceRequest"
import { statusChips } from "./statusChips"
import type { RequestsListFilters, RequestsListView } from "./types"

export default function RequestsFilters({
  view,
  filters,
  appliedFilters,
  setFilters,
  expanded,
  setExpanded,
  onSearch,
  onReset,
}: {
  view: RequestsListView
  filters: RequestsListFilters
  appliedFilters: RequestsListFilters
  setFilters: (next: (prev: RequestsListFilters) => RequestsListFilters) => void
  expanded: boolean
  setExpanded: (v: boolean) => void
  onSearch: (next?: RequestsListFilters) => void
  onReset: () => void
}) {
  const visibleStatusChips =
    view === "todo"
      ? statusChips.filter((c) => c.value === "approving" || c.value === "rejected")
      : view === "handled"
        ? statusChips.filter((c) => c.value === "done" || c.value === "rejected")
        : statusChips

  const activeFilters: { key: string; label: string; onRemove: () => void }[] = []
  if (appliedFilters.q)
    activeFilters.push({
      key: "q",
      label: `关键词：${appliedFilters.q}`,
      onRemove: () => onSearch({ ...appliedFilters, q: "" }),
    })
  if (appliedFilters.status)
    activeFilters.push({
      key: "status",
      label: `状态：${statusChips.find((s) => s.value === appliedFilters.status)?.label ?? appliedFilters.status}`,
      onRemove: () => onSearch({ ...appliedFilters, status: "" }),
    })
  if (appliedFilters.company)
    activeFilters.push({
      key: "company",
      label: `地区公司：${appliedFilters.company}`,
      onRemove: () => onSearch({ ...appliedFilters, company: "" }),
    })
  if (appliedFilters.department)
    activeFilters.push({
      key: "department",
      label: `部门：${appliedFilters.department}`,
      onRemove: () => onSearch({ ...appliedFilters, department: "" }),
    })
  if (appliedFilters.projectType)
    activeFilters.push({
      key: "projectType",
      label: `项目类型：${appliedFilters.projectType}`,
      onRemove: () => onSearch({ ...appliedFilters, projectType: "" }),
    })
  if (appliedFilters.procurementMethod)
    activeFilters.push({
      key: "procurementMethod",
      label: `采购方式：${appliedFilters.procurementMethod}`,
      onRemove: () => onSearch({ ...appliedFilters, procurementMethod: "" }),
    })
  if (appliedFilters.needDateFrom || appliedFilters.needDateTo) {
    const t = `${appliedFilters.needDateFrom || "…"} ~ ${appliedFilters.needDateTo || "…"}`
    activeFilters.push({
      key: "needDate",
      label: `需求时间：${t}`,
      onRemove: () => onSearch({ ...appliedFilters, needDateFrom: "", needDateTo: "" }),
    })
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-[240px] max-w-[520px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={filters.q}
              onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch(filters)
              }}
              className="pl-9"
              placeholder="搜索项目名称 / 需求编号"
            />
          </div>
          <Button variant="secondary" onClick={() => setExpanded(!expanded)} className="min-w-[92px]">
            <Filter className="h-4 w-4" />
            筛选
          </Button>
          <Button variant="primary" onClick={() => onSearch(filters)} className="min-w-[92px]">
            <Search className="h-4 w-4" />
            查询
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {visibleStatusChips.map((c) => (
            <button
              key={c.value}
              className={
                "rounded-full px-3 py-1 text-xs font-medium transition " +
                (filters.status === c.value
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800")
              }
              onClick={() => onSearch({ ...filters, status: filters.status === c.value ? "" : c.value })}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {expanded ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">地区公司</label>
            <Input value={filters.company} onChange={(e) => setFilters((s) => ({ ...s, company: e.target.value }))} placeholder="例如：山东公司" />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">部门</label>
            <Input value={filters.department} onChange={(e) => setFilters((s) => ({ ...s, department: e.target.value }))} placeholder="例如：潍坊作业区" />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">项目类型（mock）</label>
            <Select value={filters.projectType} onChange={(e) => setFilters((s) => ({ ...s, projectType: e.target.value as ProjectType | "" }))}>
              <option value="">全部</option>
              <option value="工程类">工程类</option>
              <option value="工程服务类">工程服务类</option>
              <option value="其他服务">其他服务</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">采购方式（mock）</label>
            <Select
              value={filters.procurementMethod}
              onChange={(e) => setFilters((s) => ({ ...s, procurementMethod: e.target.value as ProcurementMethod | "" }))}
            >
              <option value="">全部</option>
              <option value="直接采购">直接采购</option>
              <option value="询比采购">询比采购</option>
              <option value="竞价采购">竞价采购</option>
              <option value="谈判采购">谈判采购</option>
              <option value="公开招标">公开招标</option>
              <option value="邀请招标">邀请招标</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">需求时间从</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="pl-9"
                type="date"
                value={filters.needDateFrom}
                onChange={(e) => setFilters((s) => ({ ...s, needDateFrom: e.target.value }))}
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">需求时间到</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="pl-9"
                type="date"
                value={filters.needDateTo}
                onChange={(e) => setFilters((s) => ({ ...s, needDateTo: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-end gap-2 md:col-span-6">
            <Button variant="ghost" onClick={onReset}>
              重置
            </Button>
            <Button variant="primary" onClick={() => onSearch(filters)}>
              应用筛选
            </Button>
          </div>
        </div>
      ) : null}

      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">已生效筛选：</div>
          {activeFilters.map((f) => (
            <Chip key={f.key} label={f.label} onRemove={f.onRemove} />
          ))}
          <button className="ml-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300" onClick={onReset}>
            清空
          </button>
        </div>
      ) : null}
    </div>
  )
}

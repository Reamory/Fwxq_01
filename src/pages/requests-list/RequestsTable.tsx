import type { ReactNode } from "react"
import Button from "@/components/ui/Button"
import Divider from "@/components/ui/Divider"
import Skeleton from "@/components/ui/Skeleton"
import StatusBadge from "@/components/StatusBadge"
import type { ServiceRequestRecord } from "../../../shared/serviceRequest"

export type ColumnId = "requestNo" | "projectName" | "createdByName" | "org" | "procurementMethod" | "needDate" | "status"

const colWidth: Record<ColumnId, string> = {
  requestNo: "w-[11ch]",
  projectName: "",
  createdByName: "w-[14ch]",
  org: "w-[18ch]",
  procurementMethod: "w-[10ch]",
  needDate: "w-[11ch]",
  status: "w-[8ch]",
}

const columns: { id: ColumnId; label: string; render: (r: ServiceRequestRecord) => ReactNode }[] = [
  {
    id: "requestNo",
    label: "需求编号",
    render: (r) => (
      <div className="truncate whitespace-nowrap text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">{r.requestNo}</div>
    ),
  },
  {
    id: "projectName",
    label: "项目名称",
    render: (r) => <div className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{r.projectName}</div>,
  },
  {
    id: "createdByName",
    label: "提交人",
    render: (r) => {
      const name = String(r.createdByName || "").replace(/\s*[(（].*?[)）]\s*$/, "")
      const tip = [r.applicantCompany, r.applicantDepartment].filter(Boolean).join(" / ")
      return (
        <div className="text-sm text-zinc-800 dark:text-zinc-100">
          <span className="inline-block max-w-full truncate" title={tip || undefined}>
            {name || "—"}
          </span>
        </div>
      )
    },
  },
  {
    id: "org",
    label: "地区公司 / 部门",
    render: (r) => (
      <div>
        <div className="text-sm text-zinc-800 dark:text-zinc-100">{r.applicantCompany}</div>
        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{r.applicantDepartment}</div>
      </div>
    ),
  },
  {
    id: "procurementMethod",
    label: "采购方式",
    render: (r) => (
      <div className="truncate whitespace-nowrap text-sm text-zinc-800 dark:text-zinc-100">{r.procurementMethod || "—"}</div>
    ),
  },
  {
    id: "needDate",
    label: "需求时间",
    render: (r) => <div className="truncate whitespace-nowrap text-sm text-zinc-800 dark:text-zinc-100">{r.needDate || "—"}</div>,
  },
  {
    id: "status",
    label: "状态",
    render: (r) => (
      <div className="whitespace-nowrap">
        <StatusBadge status={r.status} />
      </div>
    ),
  },
]

export default function RequestsTable({
  loading,
  items,
  onOpen,
  visibleColumns,
  columnsControl,
}: {
  loading: boolean
  items: ServiceRequestRecord[]
  onOpen: (id: string) => void
  visibleColumns: ColumnId[]
  columnsControl?: ReactNode
}) {
  const visible = columns.filter((c) => visibleColumns.includes(c.id))
  const colSpan = visible.length + 1

  return (
    <>
      <Divider />
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <thead className="sticky top-0 bg-white text-left text-xs text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            <tr className="border-b border-zinc-200 dark:border-zinc-900">
              {visible.map((c) => (
                <th key={c.id} className={"px-4 py-3 " + (colWidth[c.id] ? colWidth[c.id] + " " : "") + (c.id === "procurementMethod" || c.id === "needDate" || c.id === "status" ? "whitespace-nowrap " : "")}>
                  {c.label}
                </th>
              ))}
              <th className="w-[8ch] whitespace-nowrap px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {columnsControl}
                  <span className="whitespace-nowrap">操作</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-200 dark:border-zinc-900">
                    {visible.map((c) => (
                      <td key={c.id} className="px-4 py-4">
                        <Skeleton className="h-4 w-[160px]" />
                      </td>
                    ))}
                    <td className="px-4 py-4 text-right">
                      <Skeleton className="ml-auto h-8 w-[80px]" />
                    </td>
                  </tr>
                ))
              : items.length === 0
                ? (
                    <tr>
                      <td colSpan={colSpan} className="px-4 py-12 text-center">
                        <div className="text-sm font-medium">暂无数据</div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">尝试调整筛选条件或刷新。</div>
                      </td>
                    </tr>
                  )
                : items.map((r) => (
                    <tr
                      key={r.id}
                      className="group cursor-pointer border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900/40"
                      onClick={() => onOpen(r.id)}
                    >
                      {visible.map((c) => (
                        <td
                          key={c.id}
                          className={
                            "px-4 py-4 " +
                            (colWidth[c.id] ? colWidth[c.id] + " " : "") +
                            (c.id === "procurementMethod" || c.id === "needDate" || c.id === "status" ? "whitespace-nowrap " : "")
                          }
                        >
                          {c.render(r)}
                        </td>
                      ))}
                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => onOpen(r.id)}>
                          查看
                        </Button>
                      </td>
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

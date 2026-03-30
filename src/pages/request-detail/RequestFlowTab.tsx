import Button from "@/components/ui/Button"
import type { FlowEvent } from "../../../shared/serviceRequest"

export default function RequestFlowTab({
  requestNo,
  events,
  onCopied,
}: {
  requestNo: string
  events: FlowEvent[]
  onCopied: () => void
}) {
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/40">
        <div className="min-w-0">
          <div className="text-sm font-semibold">流转记录</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">所有状态推进都由状态机驱动并记录。</div>
        </div>
        <Button
          variant="ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(requestNo)
            onCopied()
          }}
        >
          复制编号
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full">
          <thead className="text-left text-xs text-zinc-500 dark:text-zinc-400">
            <tr className="border-b border-zinc-200 dark:border-zinc-900">
              <th className="px-3 py-2">节点名称</th>
              <th className="px-3 py-2">部门</th>
              <th className="px-3 py-2">处理人</th>
              <th className="px-3 py-2">节点操作</th>
              <th className="px-3 py-2">处理意见</th>
              <th className="px-3 py-2">时间</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  暂无流转记录
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="border-b border-zinc-200 dark:border-zinc-900">
                  <td className="px-3 py-3 text-sm">{e.nodeName}</td>
                  <td className="px-3 py-3 text-sm">{e.operatorDepartment || "—"}</td>
                  <td className="px-3 py-3 text-sm">{e.operatorName}</td>
                  <td className="px-3 py-3 text-sm">{e.action}</td>
                  <td className="px-3 py-3 text-sm">{e.opinion || "—"}</td>
                  <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400">{e.createdAt}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


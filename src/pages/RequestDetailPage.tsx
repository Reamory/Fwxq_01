import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, FileText, GitBranch, Pencil, ShieldCheck, XCircle } from "lucide-react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Divider from "@/components/ui/Divider"
import StatusBadge from "@/components/StatusBadge"
import Skeleton from "@/components/ui/Skeleton"
import RightAsideSlot from "@/components/layout/RightAsideSlot"
import { api } from "@/utils/api"
import { useSessionStore } from "@/store/session"
import { useToastStore } from "@/store/toast"
import ActionDialog from "@/pages/request-detail/ActionDialog"
import RequestDocumentTab from "@/pages/request-detail/RequestDocumentTab"
import RequestFlowTab from "@/pages/request-detail/RequestFlowTab"
import AiAssistPanel from "@/pages/request-detail/AiAssistPanel"
import type { FlowEvent, ServiceRequestRecord } from "../../shared/serviceRequest"
import { getAllowedActions } from "../../shared/workflow"

type Tab = "doc" | "flow"

type DialogType = "approve" | "reject" | "withdraw" | "delete" | "submit" | null

export default function RequestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useSessionStore((s) => s.user)
  const pushToast = useToastStore((s) => s.push)

  const [tab, setTab] = useState<Tab>("doc")
  const [loading, setLoading] = useState(true)
  const [req, setReq] = useState<ServiceRequestRecord | null>(null)
  const [events, setEvents] = useState<FlowEvent[]>([])
  const [dialog, setDialog] = useState<DialogType>(null)
  const [opinion, setOpinion] = useState("")

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const r = await api.get<ServiceRequestRecord>(`/api/requests/${id}`, undefined, { user })
    if (r.success === false) {
      pushToast({ title: "加载失败", description: String(r.error), tone: "danger", ttlMs: 3500 })
      setReq(null)
      setLoading(false)
      return
    }
    const f = await api.get<FlowEvent[]>(`/api/requests/${id}/flow`, undefined, { user })
    setReq(r.data)
    setEvents(f.success === true ? f.data : [])
    setLoading(false)
  }, [id, pushToast, user])

  useEffect(() => {
    load()
  }, [load])

  const backUrl = sessionStorage.getItem("sr_last_list_url") || "/todo"

  const ctx = useMemo(() => {
    if (!req) return null
    const isCreator = req.createdByUserId === user.id
    const isAssignee = req.approvalTasks.some((t) => t.assigneeUserId === user.id && t.status === "pending")
    return { role: user.role, isCreator, isAssignee }
  }, [req, user.id, user.role])

  const allowed = useMemo(() => {
    if (!req || !ctx) return []
    return getAllowedActions(req.status, ctx)
  }, [req, ctx])

  const rejectOpinion = useMemo(() => {
    const sorted = [...events].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
    const hit = sorted.find((e) => e.action === "reject" && (e.opinion || "").trim().length > 0)
    return hit?.opinion?.trim() || ""
  }, [events])

  const doTransition = async (action: string, opinion?: string) => {
    if (!id) return false
    const res = await api.post<ServiceRequestRecord | { deleted: true }>(
      `/api/requests/${id}/transition`,
      { action, opinion },
      { user },
    )
    if (res.success === false) {
      const msg = res.error === "MissingFields" ? "提交失败：缺少必填项" : "操作失败"
      pushToast({ title: msg, description: JSON.stringify(res.data || res.error), tone: "danger", ttlMs: 4000 })
      return false
    }
    if ("deleted" in res.data) {
      pushToast({ title: "已删除", tone: "success", ttlMs: 2500 })
      navigate(backUrl)
      return true
    }
    pushToast({ title: "操作成功", tone: "success", ttlMs: 2000 })
    await load()
    return true
  }

  const onConfirm = async () => {
    if (!dialog) return
    if (dialog === "approve") {
      const ok = await doTransition("approve", opinion.trim() || undefined)
      if (!ok) return
    } else if (dialog === "reject") {
      const ok = await doTransition("reject", opinion.trim())
      if (!ok) return
    } else if (dialog === "withdraw") {
      const ok = await doTransition("withdraw")
      if (!ok) return
    } else if (dialog === "delete") {
      const ok = await doTransition("delete")
      if (!ok) return
    } else if (dialog === "submit") {
      const ok = await doTransition("submit")
      if (!ok) return
    }
    setOpinion("")
    setDialog(null)
  }

  const handleAndEdit = async () => {
    const ok = await doTransition("handle")
    if (!ok) return
    navigate(`/requests/${id}/edit`)
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to={backUrl}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </Link>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-lg font-semibold">{loading ? "—" : req?.requestNo || "—"}</div>
            {req ? <StatusBadge status={req.status} /> : null}
          </div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {req ? `创建人：${req.createdByName}` : ""}
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="mx-auto w-full">
        <Card className="p-5">
          <Skeleton className="h-6 w-[240px]" />
          <Skeleton className="mt-3 h-4 w-[320px]" />
        </Card>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="p-5 md:col-span-2">
            <Skeleton className="h-5 w-[160px]" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </Card>
          <Card className="p-5">
            <Skeleton className="h-5 w-[120px]" />
            <Skeleton className="mt-4 h-10 w-full" />
            <Skeleton className="mt-2 h-10 w-full" />
          </Card>
        </div>
      </div>
    )
  }

  if (!req) {
    return <div className="text-sm text-zinc-600 dark:text-zinc-300">未找到该单据</div>
  }

  return (
    <div className="mx-auto w-full">
      <RightAsideSlot>
        <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" />
            可执行动作
          </div>
          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">按钮展示严格由状态机与角色决定。</div>
          <Divider className="my-4" />
          {allowed.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-900 dark:bg-zinc-900/40 dark:text-zinc-300">
              当前无可执行动作。
            </div>
          ) : (
            <div className="space-y-2">
              {allowed.includes("save") || allowed.includes("submit") || allowed.includes("delete") ? (
                <div className="flex items-center gap-2">
                  {allowed.includes("save") || allowed.includes("submit") ? (
                    <Link to={`/requests/${id}/edit`} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full justify-center" aria-label="编辑">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : null}
                  {allowed.includes("submit") ? (
                    <Button variant="primary" size="sm" className="flex-1" onClick={() => setDialog("submit")}>
                      提交
                    </Button>
                  ) : null}
                  {allowed.includes("delete") ? (
                    <Button variant="danger" size="sm" className="flex-1" onClick={() => setDialog("delete")}>
                      删除
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {allowed.includes("approve") || allowed.includes("reject") ? (
                <div className="flex items-center gap-2">
                  {allowed.includes("approve") ? (
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={() => {
                        setOpinion("")
                        setDialog("approve")
                      }}
                    >
                      通过
                    </Button>
                  ) : null}
                  {allowed.includes("reject") ? (
                    <Button
                      variant="danger"
                      className="flex-1"
                      onClick={() => {
                        setOpinion("")
                        setDialog("reject")
                      }}
                    >
                      驳回
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {allowed.includes("withdraw") ? (
                <Button variant="secondary" onClick={() => setDialog("withdraw")}>
                  撤回
                </Button>
              ) : null}
              {allowed.includes("handle") ? (
                <Button variant="primary" onClick={handleAndEdit}>
                  处理并修改
                </Button>
              ) : null}
            </div>
          )}

          {req.status === "rejected" ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              <XCircle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">
                <div>驳回单据需要业务方处理后重新提交。</div>
                {rejectOpinion ? (
                  <div className="mt-1 whitespace-pre-wrap text-rose-700/90 dark:text-rose-200/90">驳回意见：{rejectOpinion}</div>
                ) : null}
              </div>
            </div>
          ) : null}

        </Card>

        <Card className="p-5">
          <AiAssistPanel req={req} role={user.role} />
        </Card>

        </div>
      </RightAsideSlot>

      <Card className="p-5">{header}</Card>

      <div className="mt-4">
        <Card>
          <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 text-sm dark:border-zinc-900">
            <button
              className={
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition " +
                (tab === "doc"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900")
              }
              onClick={() => setTab("doc")}
            >
              <FileText className="h-4 w-4" />
              单据
            </button>
            <button
              className={
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition " +
                (tab === "flow"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900")
              }
              onClick={() => setTab("flow")}
            >
              <GitBranch className="h-4 w-4" />
              流程
            </button>
          </div>

          {tab === "doc" ? (
            <RequestDocumentTab req={req} />
          ) : (
            <RequestFlowTab
              requestNo={req.requestNo}
              events={events}
              onCopied={() => pushToast({ title: "已复制编号", tone: "success", ttlMs: 1800 })}
            />
          )}
        </Card>
      </div>

      <ActionDialog
        open={dialog === "approve"}
        title="审批通过"
        description="可填写处理意见（选填）。"
        confirmLabel="确认通过"
        confirmVariant="primary"
        opinion={{ value: opinion, setValue: setOpinion }}
        opinionLabel="处理意见"
        opinionPlaceholder="可选：补充说明 / 约束条件 / 后续要求"
        onConfirm={onConfirm}
        onClose={() => setDialog(null)}
      />

      <ActionDialog
        open={dialog === "reject"}
        title="驳回单据"
        description="驳回需要填写处理意见。"
        confirmLabel="确认驳回"
        confirmVariant="danger"
        opinion={{ value: opinion, setValue: setOpinion }}
        opinionLabel="驳回原因"
        opinionPlaceholder="必填：请描述驳回原因与修改建议"
        opinionRequired
        onConfirm={onConfirm}
        onClose={() => setDialog(null)}
      />

      <ActionDialog
        open={dialog === "withdraw"}
        title="撤回提交"
        description="撤回后单据回到草稿，可继续修改。"
        confirmLabel="确认撤回"
        confirmVariant="secondary"
        onConfirm={onConfirm}
        onClose={() => setDialog(null)}
      />

      <ActionDialog
        open={dialog === "delete"}
        title="删除草稿"
        description="删除后不可恢复。"
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={onConfirm}
        onClose={() => setDialog(null)}
      />

      <ActionDialog
        open={dialog === "submit"}
        title="提交审批"
        description="提交将触发必填校验并进入审批中。"
        confirmLabel="确认提交"
        confirmVariant="primary"
        onConfirm={onConfirm}
        onClose={() => setDialog(null)}
      />
    </div>
  )
}

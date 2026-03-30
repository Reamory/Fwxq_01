import type { RequestsListView } from "./types"

export const viewMeta: Record<RequestsListView, { title: string; desc: string }> = {
  todo: { title: "我的待办", desc: "需要你处理的审批与驳回待处理单据" },
  handled: { title: "我处理的", desc: "你参与处理过的审批单据" },
  initiated: { title: "我发起的", desc: "你创建与提交的服务需求" },
  manage: { title: "服务需求管理", desc: "全量只读列表（仅查看详情）" },
}


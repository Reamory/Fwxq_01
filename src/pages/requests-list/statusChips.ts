import type { RequestStatus } from "../../../shared/serviceRequest"

export const statusChips: { label: string; value: RequestStatus }[] = [
  { label: "草稿", value: "draft" },
  { label: "审批中", value: "approving" },
  { label: "已驳回", value: "rejected" },
  { label: "已完成", value: "done" },
] as const


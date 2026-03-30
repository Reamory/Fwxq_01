import type { RequestStatus, UserRole } from "./serviceRequest"

export type WorkflowAction =
  | "save"
  | "submit"
  | "withdraw"
  | "approve"
  | "reject"
  | "handle"
  | "delete"

export type WorkflowContext = {
  role: UserRole
  isCreator: boolean
  isAssignee: boolean
  approvalIsFinal?: boolean
}

export function getAllowedActions(status: RequestStatus, ctx: WorkflowContext): WorkflowAction[] {
  if (status === "draft") {
    if (ctx.role === "business" && ctx.isCreator) return ["save", "submit", "delete"]
    return []
  }
  if (status === "approving") {
    const actions: WorkflowAction[] = []
    if (ctx.isCreator && ctx.role === "business") actions.push("withdraw")
    if (ctx.isAssignee && ctx.role === "approver") actions.push("approve", "reject")
    return actions
  }
  if (status === "rejected") {
    if (ctx.role === "business" && ctx.isCreator) return ["handle"]
    return []
  }
  return []
}

export function canPerform(status: RequestStatus, action: WorkflowAction, ctx: WorkflowContext): boolean {
  return getAllowedActions(status, ctx).includes(action)
}

export function applyAction(status: RequestStatus, action: WorkflowAction, ctx: WorkflowContext): RequestStatus | null {
  if (!canPerform(status, action, ctx)) {
    throw new Error("ActionNotAllowed")
  }
  if (status === "draft") {
    if (action === "save") return "draft"
    if (action === "submit") return "approving"
    if (action === "delete") return null
  }
  if (status === "approving") {
    if (action === "withdraw") return "draft"
    if (action === "reject") return "rejected"
    if (action === "approve") return ctx.approvalIsFinal ? "done" : "approving"
  }
  if (status === "rejected") {
    if (action === "handle") return "draft"
  }
  throw new Error("InvalidTransition")
}


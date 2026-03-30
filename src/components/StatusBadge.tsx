import { CheckCircle2, Clock3, FileText, XCircle } from "lucide-react"
import Badge from "@/components/ui/Badge"
import type { RequestStatus } from "../../shared/serviceRequest"

export default function StatusBadge({ status }: { status: RequestStatus }) {
  if (status === "draft") {
    return (
      <Badge tone="zinc">
        <FileText className="h-3.5 w-3.5" />
        草稿
      </Badge>
    )
  }
  if (status === "approving") {
    return (
      <Badge tone="indigo">
        <Clock3 className="h-3.5 w-3.5" />
        审批中
      </Badge>
    )
  }
  if (status === "rejected") {
    return (
      <Badge tone="rose">
        <XCircle className="h-3.5 w-3.5" />
        已驳回
      </Badge>
    )
  }
  return (
    <Badge tone="emerald">
      <CheckCircle2 className="h-3.5 w-3.5" />
      已完成
    </Badge>
  )
}


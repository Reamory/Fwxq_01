import { useMemo, useState } from "react"
import { Copy, Sparkles } from "lucide-react"
import Divider from "@/components/ui/Divider"
import Button from "@/components/ui/Button"
import type { ServiceRequestForm, ServiceRequestRecord, UserRole } from "../../../shared/serviceRequest"

type AssistMode = "check" | "approve" | "edit"

const isTruthy = (v: unknown) => (typeof v === "string" ? v.trim().length > 0 : !!v)

const validateOnSubmit = (form: ServiceRequestForm) => {
  const missing: string[] = []
  const must = (key: keyof ServiceRequestForm, label: string) => {
    const v = form[key]
    if (Array.isArray(v)) {
      if (v.length === 0) missing.push(label)
      return
    }
    if (!isTruthy(v)) missing.push(label)
  }

  must("fundingChannel", "资金渠道")
  must("applicantCompany", "申请单位")
  must("applicantDepartment", "申请部门")
  must("projectName", "项目名称")
  must("needDate", "需求时间")
  must("procurementMethod", "采购方式")
  must("projectType", "项目类型")
  if (form.publicVendorSelection === null) missing.push("公开选商")
  if (form.hasControlPrice === null) missing.push("是否设控制价")
  if (form.hasControlPrice === true) must("controlPriceWoTax", "控制价（不含税，万元）")

  const byGroup = (group: ServiceRequestForm["attachments"][number]["group"]) => form.attachments.some((a) => a.group === group)
  if (!byGroup("采购依据")) missing.push("采购依据")
  if (!byGroup("技术方案及批复")) missing.push("技术方案及批复")
  if (!byGroup("采购需求")) missing.push("采购需求")

  if (form.publicVendorSelection === false) {
    must("vendorInviteReason", "供应商邀请理由及产生方式")
    must("invitedVendors", "拟邀请参加选商的供应商")
    must("budgetProjectCBS", "预算项目(CBS)")
    if (!byGroup("资格材料")) missing.push("资格材料")
    if (!byGroup("审计报告")) missing.push("审计报告")
  }

  must("projectOverview", "项目概况")
  must("vendorSelectionScope", "选商范围")
  must("vendorSelectionRequirements", "选商要求")
  must("implementationLocation", "实施地点")
  must("serviceProcurementPeriod", "服务（采购）期限")
  must("contractSubject", "签约主体")
  must("applicant", "申请人")
  must("contactInfo", "联系方式")

  return missing
}

const buildApproveSuggestion = (req: ServiceRequestRecord, role: UserRole) => {
  const lines: string[] = []
  lines.push("建议审批关注点：")
  if (req.projectType === "工程类") {
    lines.push("- 施工组织与安全风险：是否明确关键风险与控制措施")
    lines.push("- 工期与实施地点：是否可执行，是否涉及高风险区域")
  } else if (req.projectType === "工程服务类") {
    lines.push("- 技术方案与批复：是否齐全且与采购需求一致")
    lines.push("- 选商范围与选商要求：是否可验证、可量化")
  } else {
    lines.push("- 服务范围与交付物：是否清晰，可验收")
    lines.push("- 合同主体与周期：是否匹配组织与预算")
  }

  if (req.hasControlPrice === true) {
    lines.push("- 控制价（不含税）：是否合理，计算口径是否说明")
  }
  if (req.publicVendorSelection === false) {
    lines.push("- 非公开选商：邀请理由、供应商名单、资格材料/审计报告是否齐备")
  }

  if (role === "approver") {
    lines.push("\n审批意见模板：")
    lines.push("- 已核对采购依据、技术方案及批复、采购需求，符合流程要求；同意按当前方案推进。")
  }
  return lines.join("\n")
}

const buildEditSuggestion = (req: ServiceRequestRecord) => {
  const missing = validateOnSubmit(req)
  const lines: string[] = []
  lines.push("修改建议：")
  if (missing.length > 0) {
    lines.push("- 优先补齐必填/附件：" + missing.join("、"))
  }
  if (!req.projectOverview.trim()) lines.push("- 补充项目概况：现状、风险、目标、约束")
  if (!req.vendorSelectionRequirements.trim()) lines.push("- 细化选商要求：资质、业绩、人员、服务响应、验收标准")
  if (req.publicVendorSelection === false && !req.vendorInviteReason.trim()) lines.push("- 补充邀请理由：来源、合规性、可追溯性")
  if (lines.length === 1) lines.push("- 当前信息较完整，可按驳回意见逐条修订后重新提交")
  return lines.join("\n")
}

export default function AiAssistPanel({ req, role }: { req: ServiceRequestRecord; role: UserRole }) {
  const [mode, setMode] = useState<AssistMode>("check")
  const output = useMemo(() => {
    if (mode === "check") {
      const missing = validateOnSubmit(req)
      if (missing.length === 0) return "未发现缺失项（按提交校验口径）。"
      return "缺失项：\n- " + missing.join("\n- ")
    }
    if (mode === "approve") return buildApproveSuggestion(req, role)
    return buildEditSuggestion(req)
  }, [mode, req, role])

  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4" />
        AI 辅助
      </div>
      <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">按业务类型给出规则检查与模板建议（未配置大模型）。</div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          className="h-9 flex-1 rounded-lg border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
          value={mode}
          onChange={(e) => setMode(e.target.value as AssistMode)}
        >
          <option value="check">检查必填/附件</option>
          <option value="approve">审批关注点/意见</option>
          <option value="edit">修改建议</option>
        </select>
        <Button
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(output)
          }}
          aria-label="复制建议"
        >
          <Copy className="h-4 w-4" />
          复制
        </Button>
      </div>

      <div className="mt-3 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-900 dark:bg-zinc-900/40 dark:text-zinc-200">
        {output}
      </div>
    </div>
  )
}

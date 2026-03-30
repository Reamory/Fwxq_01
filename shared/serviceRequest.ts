export type RequestStatus = "draft" | "approving" | "rejected" | "done"

export type FundingChannel = "投资" | "成本" | "成本+投资"

export type ProjectType = "工程类" | "工程服务类" | "其他服务"

export type ProcurementMethod =
  | "直接采购"
  | "询比采购"
  | "竞价采购"
  | "谈判采购"
  | "公开招标"
  | "邀请招标"

export type ProcurementBasisSubtype =
  | "立项文件"
  | "计划文件"
  | "费用文件"
  | "项目说明"
  | "预算审批意见"
  | "预算表"
  | "其他"

export type TechSchemeSubtype = "待定"

export type ProcurementDemandSubtype = "招标需求表" | "其他"

export type AttachmentGroup =
  | "采购依据"
  | "技术方案及批复"
  | "采购需求"
  | "资格材料"
  | "审计报告"

export type AttachmentSubtype =
  | ProcurementBasisSubtype
  | TechSchemeSubtype
  | ProcurementDemandSubtype

export type UserRole = "business" | "approver" | "manager"

export type YesNo = "是" | "否"

export type FileMeta = {
  id: string
  name: string
  size: number
  group: AttachmentGroup
  subtype?: AttachmentSubtype
  uploadedAt: string
}

export type ServiceRequestForm = {
  fundingChannel: FundingChannel | ""
  applicantCompany: string
  applicantDepartment: string
  projectName: string
  needDate: string
  procurementMethod: ProcurementMethod | ""
  projectType: ProjectType | ""
  publicVendorSelection: boolean | null
  hasControlPrice: boolean | null
  controlPriceWoTax: string
  vendorInviteReason: string
  invitedVendors: string[]
  budgetProjectCBS: string
  projectOverview: string
  vendorSelectionScope: string
  vendorSelectionRequirements: string
  mainTechnicalRequirements: string
  implementationLocation: string
  serviceProcurementPeriod: string
  remark: string
  contractSubject: string
  applicant: string
  contactInfo: string
  lotDivisionReason: string
  attachments: FileMeta[]
}

export type ApprovalTask = {
  id: string
  requestId: string
  assigneeUserId: string
  assigneeName: string
  status: "pending" | "completed"
  completedAt?: string
}

export type FlowEvent = {
  id: string
  requestId: string
  nodeName: string
  action: string
  opinion?: string
  operatorUserId: string
  operatorName: string
  operatorDepartment?: string
  startedAt?: string
  endedAt?: string
  createdAt: string
}

export type ServiceRequestRecord = ServiceRequestForm & {
  id: string
  requestNo: string
  status: RequestStatus
  createdByUserId: string
  createdByName: string
  createdAt: string
  updatedAt: string
  approvalTasks: ApprovalTask[]
}

export type SessionUser = {
  id: string
  name: string
  role: UserRole
  company: string
  department: string
}


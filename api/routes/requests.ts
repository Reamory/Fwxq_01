import express, { type Request, type Response } from "express"
import crypto from "crypto"
import type {
  ServiceRequestForm,
  ServiceRequestRecord,
  SessionUser,
  RequestStatus,
  ApprovalTask,
  FlowEvent,
  AttachmentGroup,
  FileMeta,
} from "../../shared/serviceRequest"
import { applyAction, type WorkflowAction } from "../../shared/workflow.js"
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js"

type AuthedRequest = Request & { user: SessionUser }

const router = express.Router()

const nowIso = () => new Date().toISOString()

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)

type DbApprovalTaskRow = {
  id: string
  request_id: string
  assignee_user_id: string
  assignee_name: string
  status: "pending" | "completed"
  completed_at: string | null
}

type DbServiceRequestRow = {
  id: string
  request_no: string
  status: string
  created_by_user_id: string
  created_by_name: string
  created_at: string
  updated_at: string
  funding_channel: string
  applicant_company: string
  applicant_department: string
  project_name: string
  need_date: string | null
  procurement_method: string
  project_type: string
  public_vendor_selection: boolean | null
  has_control_price: boolean | null
  control_price_wo_tax: string
  vendor_invite_reason: string
  invited_vendors: string[]
  budget_project_cbs: string
  project_overview: string
  vendor_selection_scope: string
  vendor_selection_requirements: string
  main_technical_requirements: string
  implementation_location: string
  service_procurement_period: string
  remark: string
  contract_subject: string
  applicant: string
  contact_info: string
  lot_division_reason: string
  attachments: unknown
  approval_tasks?: DbApprovalTaskRow[]
}

type DbFlowEventRow = {
  id: string
  request_id: string
  node_name: string
  action: string
  opinion: string | null
  operator_user_id: string
  operator_name: string
  operator_department: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
}

type SupabaseAdmin = NonNullable<Awaited<ReturnType<typeof getSupabaseAdmin>>>

const attachApprovalTasks = async (supabase: SupabaseAdmin, rows: DbServiceRequestRow[]) => {
  const ids = rows.map((r) => r.id)
  if (ids.length === 0) return rows

  const { data, error } = await supabase.from("approval_tasks").select("*").in("request_id", ids)
  if (error) throw error

  const tasks = ((data || []) as unknown) as DbApprovalTaskRow[]
  const byId = new Map<string, DbApprovalTaskRow[]>()
  tasks.forEach((t) => {
    const list = byId.get(t.request_id) || []
    list.push(t)
    byId.set(t.request_id, list)
  })

  return rows.map((r) => ({
    ...r,
    approval_tasks: byId.get(r.id) || [],
  }))
}

const dbRowToRecord = (row: DbServiceRequestRow): ServiceRequestRecord => {
  const attachments = (Array.isArray(row.attachments) ? row.attachments : []) as FileMeta[]
  const tasks = (row.approval_tasks || []).map(
    (t): ApprovalTask => ({
      id: t.id,
      requestId: t.request_id,
      assigneeUserId: t.assignee_user_id,
      assigneeName: t.assignee_name,
      status: t.status,
      completedAt: t.completed_at || undefined,
    }),
  )

  return {
    id: row.id,
    requestNo: row.request_no,
    status: row.status as RequestStatus,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fundingChannel: row.funding_channel as ServiceRequestRecord["fundingChannel"],
    applicantCompany: row.applicant_company,
    applicantDepartment: row.applicant_department,
    projectName: row.project_name,
    needDate: row.need_date || "",
    procurementMethod: row.procurement_method as ServiceRequestRecord["procurementMethod"],
    projectType: row.project_type as ServiceRequestRecord["projectType"],
    publicVendorSelection: row.public_vendor_selection,
    hasControlPrice: row.has_control_price,
    controlPriceWoTax: row.control_price_wo_tax,
    vendorInviteReason: row.vendor_invite_reason,
    invitedVendors: row.invited_vendors || [],
    budgetProjectCBS: row.budget_project_cbs,
    projectOverview: row.project_overview,
    vendorSelectionScope: row.vendor_selection_scope,
    vendorSelectionRequirements: row.vendor_selection_requirements,
    mainTechnicalRequirements: row.main_technical_requirements,
    implementationLocation: row.implementation_location,
    serviceProcurementPeriod: row.service_procurement_period,
    remark: row.remark,
    contractSubject: row.contract_subject,
    applicant: row.applicant,
    contactInfo: row.contact_info,
    lotDivisionReason: row.lot_division_reason,
    attachments,
    approvalTasks: tasks,
  }
}

const dbRowToFlowEvent = (row: DbFlowEventRow): FlowEvent => ({
  id: row.id,
  requestId: row.request_id,
  nodeName: row.node_name,
  action: row.action,
  opinion: row.opinion || undefined,
  operatorUserId: row.operator_user_id,
  operatorName: row.operator_name,
  operatorDepartment: row.operator_department || undefined,
  startedAt: row.started_at || undefined,
  endedAt: row.ended_at || undefined,
  createdAt: row.created_at,
})

const formToDb = (form: Partial<ServiceRequestForm>) => ({
  funding_channel: form.fundingChannel ?? "",
  applicant_company: form.applicantCompany ?? "",
  applicant_department: form.applicantDepartment ?? "",
  project_name: form.projectName ?? "",
  need_date: form.needDate ? form.needDate : null,
  procurement_method: form.procurementMethod ?? "",
  project_type: form.projectType ?? "",
  public_vendor_selection: form.publicVendorSelection ?? null,
  has_control_price: form.hasControlPrice ?? null,
  control_price_wo_tax: form.controlPriceWoTax ?? "",
  vendor_invite_reason: form.vendorInviteReason ?? "",
  invited_vendors: form.invitedVendors ?? [],
  budget_project_cbs: form.budgetProjectCBS ?? "",
  project_overview: form.projectOverview ?? "",
  vendor_selection_scope: form.vendorSelectionScope ?? "",
  vendor_selection_requirements: form.vendorSelectionRequirements ?? "",
  main_technical_requirements: form.mainTechnicalRequirements ?? "",
  implementation_location: form.implementationLocation ?? "",
  service_procurement_period: form.serviceProcurementPeriod ?? "",
  remark: form.remark ?? "",
  contract_subject: form.contractSubject ?? "",
  applicant: form.applicant ?? "",
  contact_info: form.contactInfo ?? "",
  lot_division_reason: form.lotDivisionReason ?? "",
  attachments: form.attachments ?? [],
})

const users: SessionUser[] = [
  {
    id: "u_business",
    name: "业务方-张三",
    role: "business",
    company: "山东公司",
    department: "潍坊作业区",
  },
  {
    id: "u_approver",
    name: "审批人-李四",
    role: "approver",
    company: "山东公司",
    department: "采购管理部",
  },
  {
    id: "u_manager",
    name: "管理员-王五",
    role: "manager",
    company: "山东公司",
    department: "信息管理部",
  },
]

const getUserById = (id: string) => users.find((u) => u.id === id) || users[0]

const getUserFromHeaders = (req: Request): SessionUser => {
  const id = String(req.header("x-user-id") || "")
  const user = id ? getUserById(id) : users[0]
  return user
}

const requireUser = (req: Request, res: Response, next: () => void) => {
  ;(req as AuthedRequest).user = getUserFromHeaders(req)
  next()
}

type Store = {
  counter: number
  requests: ServiceRequestRecord[]
  flowEvents: FlowEvent[]
}

const store: Store = {
  counter: 0,
  requests: [],
  flowEvents: [],
}

const generateRequestNo = () => {
  store.counter += 1
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const seq = String(store.counter).padStart(4, "0")
  return `FWXQ${yyyy}${mm}${dd}${seq}`
}

const blankForm = (): ServiceRequestForm => ({
  fundingChannel: "",
  applicantCompany: "",
  applicantDepartment: "",
  projectName: "",
  needDate: "",
  procurementMethod: "",
  projectType: "",
  publicVendorSelection: null,
  hasControlPrice: null,
  controlPriceWoTax: "",
  vendorInviteReason: "",
  invitedVendors: [],
  budgetProjectCBS: "",
  projectOverview: "",
  vendorSelectionScope: "",
  vendorSelectionRequirements: "",
  mainTechnicalRequirements: "",
  implementationLocation: "",
  serviceProcurementPeriod: "",
  remark: "",
  contractSubject: "",
  applicant: "",
  contactInfo: "",
  lotDivisionReason: "",
  attachments: [],
})

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

  const byGroup = (group: AttachmentGroup) => form.attachments.some((a) => a.group === group)
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

const createApprovalTasks = (requestId: string): ApprovalTask[] => {
  const assignees = [users[1]]
  return assignees.map((a) => ({
    id: crypto.randomUUID(),
    requestId,
    assigneeUserId: a.id,
    assigneeName: a.name,
    status: "pending",
  }))
}

const seedOnce = () => {
  if (store.requests.length > 0) return

  const u = users[0]
  const base: ServiceRequestForm = {
    ...blankForm(),
    fundingChannel: "投资",
    applicantCompany: u.company,
    applicantDepartment: u.department,
    projectName: "济青高速拓建段鲁皖成品油管道迁改工程（潍坊段）地质灾害危险性评估",
    needDate: "2026-03-21",
    procurementMethod: "公开招标",
    projectType: "工程服务类",
    publicVendorSelection: true,
    hasControlPrice: true,
    controlPriceWoTax: "148.1200",
    projectOverview: "工程现状与风险概述...",
    vendorSelectionScope: "山东公司范围内符合资质的承包商...",
    vendorSelectionRequirements: "准入、资质与经验要求...",
    implementationLocation: "潍坊",
    serviceProcurementPeriod: "2026-03-25 ~ 2026-06-30",
    contractSubject: "山东公司",
    applicant: "张三",
    contactInfo: "13800000000",
  }

  const draft: ServiceRequestRecord = {
    ...base,
    id: crypto.randomUUID(),
    requestNo: generateRequestNo(),
    status: "draft",
    createdByUserId: u.id,
    createdByName: u.name,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    approvalTasks: [],
  }
  store.requests.push(draft)

  const approving: ServiceRequestRecord = {
    ...draft,
    id: crypto.randomUUID(),
    requestNo: generateRequestNo(),
    status: "approving",
    approvalTasks: createApprovalTasks("temp"),
  }
  approving.approvalTasks = approving.approvalTasks.map((t) => ({ ...t, requestId: approving.id }))
  store.requests.push(approving)
}

seedOnce()

router.use(requireUser)

router.get("/", async (req: Request, res: Response) => {
  const supabase = await getSupabaseAdmin()
  if (supabase) {
    const user = (req as AuthedRequest).user
    const view = String(req.query.view || "todo")
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1)
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(String(req.query.pageSize || "20"), 10) || 20))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const q = String(req.query.q || "").trim()
    const status = String(req.query.status || "").trim()
    const company = String(req.query.company || "").trim()
    const department = String(req.query.department || "").trim()
    const projectType = String(req.query.projectType || "").trim()
    const procurementMethod = String(req.query.procurementMethod || "").trim()
    const needDateFrom = String(req.query.needDateFrom || "").trim()
    const needDateTo = String(req.query.needDateTo || "").trim()

    const baseQuery = (withCount: boolean) => {
      let qb: any = supabase.from("service_requests").select("*", withCount ? { count: "exact" } : undefined)
      qb = qb.order("updated_at", { ascending: false })
      if (status) qb = qb.eq("status", status)
      if (company) qb = qb.eq("applicant_company", company)
      if (department) qb = qb.eq("applicant_department", department)
      if (projectType) qb = qb.eq("project_type", projectType)
      if (procurementMethod) qb = qb.eq("procurement_method", procurementMethod)
      if (needDateFrom) qb = qb.gte("need_date", needDateFrom)
      if (needDateTo) qb = qb.lte("need_date", needDateTo)
      if (q) qb = qb.or(`project_name.ilike.%${q}%,request_no.ilike.%${q}%`)
      return qb
    }

    try {
      let rows: DbServiceRequestRow[] = []
      let total = 0

      if (view === "handled") {
        const { data: ev, error: evErr } = await supabase
          .from("flow_events")
          .select("request_id")
          .eq("operator_user_id", user.id)
          .in("action", ["approve", "reject"])

        if (evErr) {
          res.status(500).json({ success: false, error: "DbError" })
          return
        }

        const ids = Array.from(new Set((ev || []).map((x) => String((x as { request_id: unknown }).request_id))))
        if (ids.length === 0) {
          res.json({ success: true, data: { items: [], total: 0 } })
          return
        }

        const { data, error, count } = await baseQuery(true).in("id", ids).range(from, to)
        if (error) {
          res.status(500).json({ success: false, error: "DbError" })
          return
        }
        rows = (((data || []) as unknown) as DbServiceRequestRow[])
        total = count ?? 0
      } else if (view === "initiated") {
        const { data, error, count } = await baseQuery(true).eq("created_by_user_id", user.id).range(from, to)
        if (error) {
          res.status(500).json({ success: false, error: "DbError" })
          return
        }
        rows = (((data || []) as unknown) as DbServiceRequestRow[])
        total = count ?? 0
      } else if (view === "manage") {
        const { data, error, count } = await baseQuery(true).range(from, to)
        if (error) {
          res.status(500).json({ success: false, error: "DbError" })
          return
        }
        rows = (((data || []) as unknown) as DbServiceRequestRow[])
        total = count ?? 0
      } else if (view === "global") {
        if (user.role === "manager") {
          const { data, error, count } = await baseQuery(true).range(from, to)
          if (error) {
            res.status(500).json({ success: false, error: "DbError" })
            return
          }
          rows = (((data || []) as unknown) as DbServiceRequestRow[])
          total = count ?? 0
        } else if (user.role === "business") {
          const { data, error, count } = await baseQuery(true).eq("created_by_user_id", user.id).range(from, to)
          if (error) {
            res.status(500).json({ success: false, error: "DbError" })
            return
          }
          rows = (((data || []) as unknown) as DbServiceRequestRow[])
          total = count ?? 0
        } else {
          const ids = new Set<string>()

          const { data: pending, error: pendingErr } = await supabase
            .from("approval_tasks")
            .select("request_id")
            .eq("assignee_user_id", user.id)
            .eq("status", "pending")
          if (pendingErr) {
            res.status(500).json({ success: false, error: "DbError" })
            return
          }
          ;(pending || []).forEach((x) => ids.add(String((x as { request_id: unknown }).request_id)))

          const { data: handled, error: handledErr } = await supabase
            .from("flow_events")
            .select("request_id")
            .eq("operator_user_id", user.id)
            .in("action", ["approve", "reject"])
          if (handledErr) {
            res.status(500).json({ success: false, error: "DbError" })
            return
          }
          ;(handled || []).forEach((x) => ids.add(String((x as { request_id: unknown }).request_id)))

          const all = Array.from(ids)
          if (all.length === 0) {
            res.json({ success: true, data: { items: [], total: 0 } })
            return
          }

          const { data, error, count } = await baseQuery(true).in("id", all).range(from, to)
          if (error) {
            res.status(500).json({ success: false, error: "DbError" })
            return
          }
          rows = (((data || []) as unknown) as DbServiceRequestRow[])
          total = count ?? 0
        }
      } else {
        const pendingIds = new Set<string>()
        const { data: pending, error: pendingErr } = await supabase
          .from("approval_tasks")
          .select("request_id")
          .eq("assignee_user_id", user.id)
          .eq("status", "pending")
        if (pendingErr) {
          res.status(500).json({ success: false, error: "DbError" })
          return
        }
        ;(pending || []).forEach((x) => pendingIds.add(String((x as { request_id: unknown }).request_id)))

        const loadPendingApprovals = async () => {
          const ids = Array.from(pendingIds)
          if (ids.length === 0) return [] as DbServiceRequestRow[]
          const { data, error } = await baseQuery(false).in("id", ids).eq("status", "approving")
          if (error) {
            res.status(500).json({ success: false, error: "DbError" })
            return null
          }
          return (((data || []) as unknown) as DbServiceRequestRow[])
        }

        const loadRejectedCreatedByMe = async () => {
          const { data, error } = await baseQuery(false).eq("created_by_user_id", user.id).eq("status", "rejected")
          if (error) {
            res.status(500).json({ success: false, error: "DbError" })
            return null
          }
          return (((data || []) as unknown) as DbServiceRequestRow[])
        }

        const [pendingRows, rejectedRows] = await Promise.all([loadPendingApprovals(), loadRejectedCreatedByMe()])
        if (pendingRows === null || rejectedRows === null) return

        const merged = new Map<string, DbServiceRequestRow>()
        pendingRows.forEach((r) => merged.set(String(r.id), r))
        rejectedRows.forEach((r) => merged.set(String(r.id), r))

        const allRows = Array.from(merged.values())
        allRows.sort((a, b) => {
          const ta = new Date(String((a as any).updated_at || (a as any).created_at || 0)).getTime()
          const tb = new Date(String((b as any).updated_at || (b as any).created_at || 0)).getTime()
          return tb - ta
        })

        total = allRows.length
        rows = allRows.slice(from, from + pageSize)
      }

      rows = await attachApprovalTasks(supabase, rows)

      const items = rows.map(dbRowToRecord)

      res.json({
        success: true,
        data: {
          items,
          total,
        },
      })
      return
    } catch {
      res.status(500).json({ success: false, error: "DbError" })
      return
    }
  }

  const user = (req as AuthedRequest).user
  const view = String(req.query.view || "todo")
  const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1)
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(String(req.query.pageSize || "20"), 10) || 20))
  const from = (page - 1) * pageSize
  const q = String(req.query.q || "").trim()
  const status = String(req.query.status || "").trim()
  const company = String(req.query.company || "").trim()
  const department = String(req.query.department || "").trim()
  const projectType = String(req.query.projectType || "").trim()
  const procurementMethod = String(req.query.procurementMethod || "").trim()
  const needDateFrom = String(req.query.needDateFrom || "").trim()
  const needDateTo = String(req.query.needDateTo || "").trim()

  const isAssignee = (r: ServiceRequestRecord) =>
    r.approvalTasks.some((t) => t.assigneeUserId === user.id && t.status === "pending")

  let list = store.requests.slice()
  if (view === "todo") {
    list = list.filter((r) => (r.status === "approving" && isAssignee(r)) || (r.status === "rejected" && r.createdByUserId === user.id))
  } else if (view === "handled") {
    const handledIds = new Set(
      store.flowEvents.filter((e) => e.operatorUserId === user.id && ["approve", "reject"].includes(e.action)).map((e) => e.requestId),
    )
    list = list.filter((r) => handledIds.has(r.id))
  } else if (view === "initiated") {
    list = list.filter((r) => r.createdByUserId === user.id)
  } else if (view === "global") {
    if (user.role === "business") {
      list = list.filter((r) => r.createdByUserId === user.id)
    } else {
      const handledIds = new Set(
        store.flowEvents.filter((e) => e.operatorUserId === user.id && ["approve", "reject"].includes(e.action)).map((e) => e.requestId),
      )
      list = list.filter((r) => (r.status === "approving" && isAssignee(r)) || handledIds.has(r.id))
    }
  }

  if (q) {
    list = list.filter((r) => r.projectName.includes(q) || r.requestNo.includes(q))
  }
  if (status) {
    list = list.filter((r) => r.status === status)
  }
  if (company) list = list.filter((r) => r.applicantCompany === company)
  if (department) list = list.filter((r) => r.applicantDepartment === department)
  if (projectType) list = list.filter((r) => r.projectType === projectType)
  if (procurementMethod) list = list.filter((r) => r.procurementMethod === procurementMethod)
  if (needDateFrom) list = list.filter((r) => r.needDate >= needDateFrom)
  if (needDateTo) list = list.filter((r) => r.needDate <= needDateTo)

  list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  const total = list.length
  list = list.slice(from, from + pageSize)

  res.json({
    success: true,
    data: {
      items: list,
      total,
    },
  })
})

router.get("/inbox", async (req: Request, res: Response) => {
  const user = (req as AuthedRequest).user
  const tab = String(req.query.tab || "all") as "all" | "todo" | "done"
  const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1)
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(String(req.query.pageSize || "20"), 10) || 20))
  const from = (page - 1) * pageSize

  const supabase = await getSupabaseAdmin()
  if (supabase) {
    try {
      const pendingIds = new Set<string>()
      const { data: pending, error: pendingErr } = await supabase
        .from("approval_tasks")
        .select("request_id")
        .eq("assignee_user_id", user.id)
        .eq("status", "pending")
      if (pendingErr) {
        res.status(500).json({ success: false, error: "DbError" })
        return
      }
      ;(pending || []).forEach((x) => pendingIds.add(String((x as { request_id: unknown }).request_id)))

      const pendingIdList = Array.from(pendingIds)

      const todoApprovingCountPromise = pendingIdList.length
        ? supabase
            .from("service_requests")
            .select("id", { count: "exact", head: true })
            .in("id", pendingIdList)
            .eq("status", "approving")
        : Promise.resolve({ count: 0, error: null } as unknown as { count: number | null; error: any })

      const rejectedCountPromise = supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .eq("created_by_user_id", user.id)
        .eq("status", "rejected")

      const doneCountPromise =
        user.role === "business"
          ? supabase
              .from("service_requests")
              .select("id", { count: "exact", head: true })
              .eq("created_by_user_id", user.id)
              .eq("status", "done")
          : Promise.resolve({ count: 0, error: null } as unknown as { count: number | null; error: any })

      const [todoApprovingCountRes, rejectedCountRes, doneCountRes] = await Promise.all([
        todoApprovingCountPromise,
        rejectedCountPromise,
        doneCountPromise,
      ])

      if (todoApprovingCountRes.error || rejectedCountRes.error || doneCountRes.error) {
        res.status(500).json({ success: false, error: "DbError" })
        return
      }

      const todoCount = (todoApprovingCountRes.count ?? 0) + (rejectedCountRes.count ?? 0)
      const doneCount = doneCountRes.count ?? 0
      const allCount = todoCount + doneCount

      const cap = from + pageSize
      const loadTodoApproving = async () => {
        if (pendingIdList.length === 0) return [] as DbServiceRequestRow[]
        const { data, error } = await supabase
          .from("service_requests")
          .select("*")
          .in("id", pendingIdList)
          .eq("status", "approving")
          .order("updated_at", { ascending: false })
          .limit(cap)
        if (error) throw error
        return (((data || []) as unknown) as DbServiceRequestRow[])
      }

      const loadTodoRejected = async () => {
        const { data, error } = await supabase
          .from("service_requests")
          .select("*")
          .eq("created_by_user_id", user.id)
          .eq("status", "rejected")
          .order("updated_at", { ascending: false })
          .limit(cap)
        if (error) throw error
        return (((data || []) as unknown) as DbServiceRequestRow[])
      }

      const loadDone = async () => {
        if (user.role !== "business") return [] as DbServiceRequestRow[]
        const { data, error } = await supabase
          .from("service_requests")
          .select("*")
          .eq("created_by_user_id", user.id)
          .eq("status", "done")
          .order("updated_at", { ascending: false })
          .limit(cap)
        if (error) throw error
        return (((data || []) as unknown) as DbServiceRequestRow[])
      }

      const [todoApprovingRows, todoRejectedRows, doneRows] = await Promise.all([loadTodoApproving(), loadTodoRejected(), loadDone()])

      const notificationsAll = [
        ...todoApprovingRows.map((r) => ({
          id: `todo:${r.id}`,
          kind: "todo" as const,
          title: "待办处理",
          request: dbRowToRecord({ ...r, approval_tasks: [] }),
          ts: r.updated_at || r.created_at,
        })),
        ...todoRejectedRows.map((r) => ({
          id: `todo:${r.id}`,
          kind: "todo" as const,
          title: "驳回待处理",
          request: dbRowToRecord({ ...r, approval_tasks: [] }),
          ts: r.updated_at || r.created_at,
        })),
        ...doneRows.map((r) => ({
          id: `done:${r.id}`,
          kind: "done" as const,
          title: "审批已完成",
          request: dbRowToRecord({ ...r, approval_tasks: [] }),
          ts: r.updated_at || r.created_at,
        })),
      ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

      const filtered =
        tab === "todo" ? notificationsAll.filter((n) => n.kind === "todo") : tab === "done" ? notificationsAll.filter((n) => n.kind === "done") : notificationsAll

      const total = tab === "todo" ? todoCount : tab === "done" ? doneCount : allCount
      const items = filtered.slice(from, from + pageSize)

      res.json({
        success: true,
        data: {
          items,
          total,
          counts: {
            all: allCount,
            todo: todoCount,
            done: doneCount,
          },
        },
      })
      return
    } catch {
      res.status(500).json({ success: false, error: "DbError" })
      return
    }
  }

  const isAssignee = (r: ServiceRequestRecord) => r.approvalTasks.some((t) => t.assigneeUserId === user.id && t.status === "pending")

  const todoList = store.requests
    .filter((r) => (r.status === "approving" && isAssignee(r)) || (r.status === "rejected" && r.createdByUserId === user.id))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  const doneList =
    user.role === "business"
      ? store.requests
          .filter((r) => r.createdByUserId === user.id && r.status === "done")
          .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      : []

  const all = [
    ...todoList.map((r) => ({
      id: `todo:${r.id}`,
      kind: "todo" as const,
      title: r.status === "rejected" ? "驳回待处理" : "待办处理",
      request: r,
      ts: r.updatedAt || r.createdAt,
    })),
    ...doneList.map((r) => ({
      id: `done:${r.id}`,
      kind: "done" as const,
      title: "审批已完成",
      request: r,
      ts: r.updatedAt || r.createdAt,
    })),
  ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

  const todoCount = todoList.length
  const doneCount = doneList.length
  const allCount = all.length
  const filtered = tab === "todo" ? all.filter((n) => n.kind === "todo") : tab === "done" ? all.filter((n) => n.kind === "done") : all
  const total = tab === "todo" ? todoCount : tab === "done" ? doneCount : allCount
  const items = filtered.slice(from, from + pageSize)
  res.json({ success: true, data: { items, total, counts: { all: allCount, todo: todoCount, done: doneCount } } })
})

router.get("/:id", async (req: Request, res: Response) => {
  const supabase = await getSupabaseAdmin()
  if (supabase) {
    const { data, error } = await supabase.from("service_requests").select("*").eq("id", req.params.id).single()
    if (error || !data) {
      res.status(404).json({ success: false, error: "NotFound" })
      return
    }
    const rows = await attachApprovalTasks(supabase, [((data as unknown) as DbServiceRequestRow)])
    res.json({ success: true, data: dbRowToRecord(rows[0]) })
    return
  }

  const r = store.requests.find((x) => x.id === req.params.id)
  if (!r) {
    res.status(404).json({ success: false, error: "NotFound" })
    return
  }
  res.json({ success: true, data: r })
})

router.post("/", async (req: Request, res: Response) => {
  const supabase = await getSupabaseAdmin()
  if (supabase) {
    const user = (req as AuthedRequest).user
    const raw = (req.body || {}) as Record<string, unknown>
    const clientRequestId = typeof raw.clientRequestId === "string" ? raw.clientRequestId.trim() : ""
    const payload = raw as Partial<ServiceRequestForm>
    const insertPayload = {
      ...formToDb(payload),
      ...(clientRequestId && isUuid(clientRequestId) ? { id: clientRequestId } : {}),
      status: "draft",
      created_by_user_id: user.id,
      created_by_name: user.name,
    }
    const { data, error } = await supabase.from("service_requests").insert(insertPayload).select("*").single()
    if (error || !data) {
      if (clientRequestId && isUuid(clientRequestId) && (error?.code === "23505" || String(error?.message || "").toLowerCase().includes("duplicate"))) {
        const { data: existing, error: existingErr } = await supabase
          .from("service_requests")
          .select("*")
          .eq("id", clientRequestId)
          .single()
        if (existingErr || !existing) {
          res.status(500).json({ success: false, error: "DbError" })
          return
        }
        const rows = await attachApprovalTasks(supabase, [((existing as unknown) as DbServiceRequestRow)])
        res.json({ success: true, data: dbRowToRecord(rows[0]) })
        return
      }

      res.status(500).json({ success: false, error: "DbError" })
      return
    }

    await supabase.from("flow_events").insert({
      request_id: (data as DbServiceRequestRow).id,
      node_name: "开始",
      action: "save",
      operator_user_id: user.id,
      operator_name: user.name,
      operator_department: user.department,
    })

    const rows = await attachApprovalTasks(supabase, [((data as unknown) as DbServiceRequestRow)])
    res.status(201).json({ success: true, data: dbRowToRecord(rows[0]) })
    return
  }

  const user = (req as AuthedRequest).user
  const raw = (req.body || {}) as Record<string, unknown>
  const clientRequestId = typeof raw.clientRequestId === "string" ? raw.clientRequestId.trim() : ""
  const payload = raw as Partial<ServiceRequestForm>
  const existing = clientRequestId ? store.requests.find((x) => x.id === clientRequestId) : undefined
  if (existing) {
    res.json({ success: true, data: existing })
    return
  }

  const id = clientRequestId && isUuid(clientRequestId) ? clientRequestId : crypto.randomUUID()
  const createdAt = nowIso()
  const record: ServiceRequestRecord = {
    ...blankForm(),
    ...payload,
    id,
    requestNo: generateRequestNo(),
    status: "draft",
    createdByUserId: user.id,
    createdByName: user.name,
    createdAt,
    updatedAt: createdAt,
    approvalTasks: [],
  }
  store.requests.unshift(record)
  store.flowEvents.unshift({
    id: crypto.randomUUID(),
    requestId: record.id,
    nodeName: "开始",
    action: "save",
    operatorUserId: user.id,
    operatorName: user.name,
    operatorDepartment: user.department,
    createdAt: createdAt,
  })
  res.status(201).json({ success: true, data: record })
})

router.put("/:id", async (req: Request, res: Response) => {
  const supabase = await getSupabaseAdmin()
  if (supabase) {
    const user = (req as AuthedRequest).user
    const { data: current, error: currentErr } = await supabase
      .from("service_requests")
      .select("*")
      .eq("id", req.params.id)
      .single()

    if (currentErr || !current) {
      res.status(404).json({ success: false, error: "NotFound" })
      return
    }

    const currentRows = await attachApprovalTasks(supabase, [((current as unknown) as DbServiceRequestRow)])
    const record = dbRowToRecord(currentRows[0])
    if (record.createdByUserId !== user.id) {
      res.status(403).json({ success: false, error: "Forbidden" })
      return
    }
    if (record.status !== "draft") {
      res.status(400).json({ success: false, error: "OnlyDraftEditable" })
      return
    }

    const payload = (req.body || {}) as ServiceRequestForm
    const { data: updated, error } = await supabase
      .from("service_requests")
      .update(formToDb(payload))
      .eq("id", req.params.id)
      .select("*")
      .single()

    if (error || !updated) {
      res.status(500).json({ success: false, error: "DbError" })
      return
    }

    const updatedRows = await attachApprovalTasks(supabase, [((updated as unknown) as DbServiceRequestRow)])
    res.json({ success: true, data: dbRowToRecord(updatedRows[0]) })
    return
  }

  const user = (req as AuthedRequest).user
  const idx = store.requests.findIndex((x) => x.id === req.params.id)
  if (idx < 0) {
    res.status(404).json({ success: false, error: "NotFound" })
    return
  }
  const current = store.requests[idx]
  if (current.createdByUserId !== user.id) {
    res.status(403).json({ success: false, error: "Forbidden" })
    return
  }
  if (current.status !== "draft") {
    res.status(400).json({ success: false, error: "OnlyDraftEditable" })
    return
  }
  const payload = (req.body || {}) as ServiceRequestForm
  const updated: ServiceRequestRecord = {
    ...current,
    ...payload,
    updatedAt: nowIso(),
  }
  store.requests[idx] = updated
  res.json({ success: true, data: updated })
})

router.get("/:id/flow", async (req: Request, res: Response) => {
  const supabase = await getSupabaseAdmin()
  if (supabase) {
    const { data, error } = await supabase.from("flow_events").select("*").eq("request_id", req.params.id).order("created_at", { ascending: false })
    if (error) {
      res.status(500).json({ success: false, error: "DbError" })
      return
    }
    const events = ((data || []) as DbFlowEventRow[]).map(dbRowToFlowEvent)
    res.json({ success: true, data: events })
    return
  }

  const events = store.flowEvents.filter((e) => e.requestId === req.params.id)
  res.json({ success: true, data: events })
})

router.post("/:id/transition", async (req: Request, res: Response) => {
  const supabase = await getSupabaseAdmin()
  if (supabase) {
    const user = (req as AuthedRequest).user
    const action = String((req.body || {}).action || "") as WorkflowAction
    const opinion = String((req.body || {}).opinion || "").trim()

    const { data: currentRow, error: currentErr } = await supabase
      .from("service_requests")
      .select("*")
      .eq("id", req.params.id)
      .single()

    if (currentErr || !currentRow) {
      res.status(404).json({ success: false, error: "NotFound" })
      return
    }

    const currentRows = await attachApprovalTasks(supabase, [((currentRow as unknown) as DbServiceRequestRow)])
    const current = dbRowToRecord(currentRows[0])
    const isCreator = current.createdByUserId === user.id
    const isAssignee = current.approvalTasks.some((t) => t.assigneeUserId === user.id && t.status === "pending")

    const ctxBase = {
      role: user.role,
      isCreator,
      isAssignee,
    } as const

    if (current.status === "draft" && action === "submit") {
      const missing = validateOnSubmit(current)
      if (missing.length > 0) {
        res.status(400).json({ success: false, error: "MissingFields", data: { missing } })
        return
      }
    }

    if (current.status === "approving" && action === "approve") {
      if (!isAssignee) {
        res.status(403).json({ success: false, error: "Forbidden" })
        return
      }
    }

    let nextStatus: RequestStatus | null
    if (action === "approve") {
      const pending = current.approvalTasks.filter((t) => t.status === "pending")
      const approvalIsFinal = pending.length <= 1
      nextStatus = applyAction(current.status, action, { ...ctxBase, approvalIsFinal })
    } else {
      nextStatus = applyAction(current.status, action, ctxBase)
    }

    if (nextStatus === null) {
      const { error: delErr } = await supabase.from("service_requests").delete().eq("id", current.id)
      if (delErr) {
        res.status(500).json({ success: false, error: "DbError" })
        return
      }
      res.json({ success: true, data: { deleted: true } })
      return
    }

    const updateRes = await supabase
      .from("service_requests")
      .update({ status: nextStatus })
      .eq("id", current.id)
      .select("*")
      .single()

    if (updateRes.error) {
      res.status(500).json({ success: false, error: "DbError" })
      return
    }

    if (current.status === "draft" && nextStatus === "approving") {
      const tasks = createApprovalTasks(current.id)
      const inserts = tasks.map((t) => ({
        request_id: current.id,
        assignee_user_id: t.assigneeUserId,
        assignee_name: t.assigneeName,
        status: t.status,
      }))
      const { error } = await supabase.from("approval_tasks").insert(inserts)
      if (error) {
        res.status(500).json({ success: false, error: "DbError" })
        return
      }
    }

    if (current.status === "approving" && action === "withdraw" && nextStatus === "draft") {
      const { error } = await supabase.from("approval_tasks").delete().eq("request_id", current.id)
      if (error) {
        res.status(500).json({ success: false, error: "DbError" })
        return
      }
    }

    if (current.status === "approving" && action === "approve") {
      const { data: task, error: taskErr } = await supabase
        .from("approval_tasks")
        .select("id")
        .eq("request_id", current.id)
        .eq("assignee_user_id", user.id)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle()

      if (taskErr) {
        res.status(500).json({ success: false, error: "DbError" })
        return
      }
      if (task?.id) {
        const { error } = await supabase
          .from("approval_tasks")
          .update({ status: "completed", completed_at: nowIso() })
          .eq("id", String(task.id))
        if (error) {
          res.status(500).json({ success: false, error: "DbError" })
          return
        }
      }
    }

    if (current.status === "approving" && action === "reject" && nextStatus === "rejected") {
      const { error } = await supabase
        .from("approval_tasks")
        .update({ status: "completed", completed_at: nowIso() })
        .eq("request_id", current.id)
        .eq("status", "pending")
      if (error) {
        res.status(500).json({ success: false, error: "DbError" })
        return
      }
    }

    if (current.status === "rejected" && action === "handle" && nextStatus === "draft") {
      const { error } = await supabase.from("approval_tasks").delete().eq("request_id", current.id)
      if (error) {
        res.status(500).json({ success: false, error: "DbError" })
        return
      }
    }

    const nodeName =
      current.status === "draft" ? "草稿" : current.status === "approving" ? "审批中" : current.status === "rejected" ? "已驳回" : "已完成"

    const { error: flowErr } = await supabase.from("flow_events").insert({
      request_id: current.id,
      node_name: nodeName,
      action,
      opinion: opinion || null,
      operator_user_id: user.id,
      operator_name: user.name,
      operator_department: user.department,
    })
    if (flowErr) {
      res.status(500).json({ success: false, error: "DbError" })
      return
    }

    const { data: finalRow, error: finalErr } = await supabase
      .from("service_requests")
      .select("*")
      .eq("id", current.id)
      .single()
    if (finalErr || !finalRow) {
      res.status(500).json({ success: false, error: "DbError" })
      return
    }

    const finalRows = await attachApprovalTasks(supabase, [((finalRow as unknown) as DbServiceRequestRow)])
    res.json({ success: true, data: dbRowToRecord(finalRows[0]) })
    return
  }

  const user = (req as AuthedRequest).user
  const idx = store.requests.findIndex((x) => x.id === req.params.id)
  if (idx < 0) {
    res.status(404).json({ success: false, error: "NotFound" })
    return
  }
  const current = store.requests[idx]
  const action = String((req.body || {}).action || "") as WorkflowAction
  const opinion = String((req.body || {}).opinion || "").trim()

  const isCreator = current.createdByUserId === user.id
  const isAssignee = current.approvalTasks.some((t) => t.assigneeUserId === user.id && t.status === "pending")

  const ctxBase = {
    role: user.role,
    isCreator,
    isAssignee,
  } as const

  if (current.status === "draft" && action === "submit") {
    const missing = validateOnSubmit(current)
    if (missing.length > 0) {
      res.status(400).json({ success: false, error: "MissingFields", data: { missing } })
      return
    }
  }

  if (current.status === "approving" && action === "approve") {
    if (!isAssignee) {
      res.status(403).json({ success: false, error: "Forbidden" })
      return
    }
  }

  let nextStatus: RequestStatus | null
  if (action === "approve") {
    const pending = current.approvalTasks.filter((t) => t.status === "pending")
    const approvalIsFinal = pending.length <= 1
    nextStatus = applyAction(current.status, action, { ...ctxBase, approvalIsFinal })
  } else {
    nextStatus = applyAction(current.status, action, ctxBase)
  }

  if (nextStatus === null) {
    store.requests.splice(idx, 1)
    store.flowEvents.unshift({
      id: crypto.randomUUID(),
      requestId: current.id,
      nodeName: "草稿",
      action,
      opinion: opinion || undefined,
      operatorUserId: user.id,
      operatorName: user.name,
      operatorDepartment: user.department,
      createdAt: nowIso(),
    })
    res.json({ success: true, data: { deleted: true } })
    return
  }

  const updated: ServiceRequestRecord = { ...current, status: nextStatus, updatedAt: nowIso() }

  if (current.status === "draft" && nextStatus === "approving") {
    updated.approvalTasks = createApprovalTasks(updated.id)
  }
  if (current.status === "approving" && action === "withdraw" && nextStatus === "draft") {
    updated.approvalTasks = []
  }
  if (current.status === "approving" && action === "approve") {
    const tasks = updated.approvalTasks.map((t) => ({ ...t }))
    const nextPending = tasks.find((t) => t.assigneeUserId === user.id && t.status === "pending")
    if (nextPending) {
      nextPending.status = "completed"
      nextPending.completedAt = nowIso()
    }
    updated.approvalTasks = tasks
  }
  if (current.status === "approving" && action === "reject" && nextStatus === "rejected") {
    updated.approvalTasks = updated.approvalTasks.map((t) => (t.status === "pending" ? { ...t, status: "completed", completedAt: nowIso() } : t))
  }
  if (current.status === "rejected" && action === "handle" && nextStatus === "draft") {
    updated.approvalTasks = []
  }

  store.requests[idx] = updated
  store.flowEvents.unshift({
    id: crypto.randomUUID(),
    requestId: updated.id,
    nodeName: current.status === "draft" ? "草稿" : current.status === "approving" ? "审批中" : current.status === "rejected" ? "已驳回" : "已完成",
    action,
    opinion: opinion || undefined,
    operatorUserId: user.id,
    operatorName: user.name,
    operatorDepartment: user.department,
    createdAt: nowIso(),
  })

  res.json({ success: true, data: updated })
})

export default router

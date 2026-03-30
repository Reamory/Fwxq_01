import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CircleHelp, Paperclip, Save, Send } from "lucide-react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import Select from "@/components/ui/Select"
import Divider from "@/components/ui/Divider"
import RightAsideSlot from "@/components/layout/RightAsideSlot"
import { api } from "@/utils/api"
import { useSessionStore } from "@/store/session"
import { useToastStore } from "@/store/toast"
import type {
  AttachmentGroup,
  AttachmentSubtype,
  FileMeta,
  FundingChannel,
  ProcurementMethod,
  ProjectType,
  ServiceRequestForm,
  ServiceRequestRecord,
} from "../../shared/serviceRequest"

type Mode = "new" | "edit"

const blank = (): ServiceRequestForm => ({
  fundingChannel: "",
  applicantCompany: "",
  applicantDepartment: "",
  projectName: "",
  needDate: "",
  procurementMethod: "",
  projectType: "",
  publicVendorSelection: null,
  singleSourceReason: "",
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

const vendorMock = ["华北供应商A", "华东供应商B", "优选承包商C"]

export default function RequestFormPage({ mode }: { mode: Mode }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useSessionStore((s) => s.user)
  const pushToast = useToastStore((s) => s.push)

  const [loading, setLoading] = useState(mode === "edit")
  const inFlightRef = useRef(false)
  const [mutating, setMutating] = useState(false)
  const clientRequestIdRef = useRef(globalThis.crypto.randomUUID())
  const [requestNo, setRequestNo] = useState<string | null>(null)
  const [fundingOptions, setFundingOptions] = useState<FundingChannel[]>(["投资", "成本", "成本+投资"])
  const [procurementOptions, setProcurementOptions] = useState<ProcurementMethod[]>(["直接采购", "询比采购", "竞价采购", "谈判采购", "公开招标", "邀请招标"])
  const [projectTypeOptions, setProjectTypeOptions] = useState<ProjectType[]>(["工程类", "工程服务类", "其他服务"])
  const [companyOptions, setCompanyOptions] = useState<string[]>(["山东公司", "广西公司"])
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([])
  const [form, setForm] = useState<ServiceRequestForm>(() => {
    const f = blank()
    f.applicantCompany = user.company
    f.applicantDepartment = user.department
    f.applicant = user.name
    return f
  })

  const procurementMethod = String(form.procurementMethod || "").trim()
  const showPublicVendorSelection =
    procurementMethod === "询比采购" ||
    procurementMethod === "竞价采购" ||
    procurementMethod === "谈判采购" ||
    procurementMethod === "公开招标" ||
    procurementMethod === "直接采购" ||
    procurementMethod === "邀请招标"
  const lockPublicVendorSelection = procurementMethod === "直接采购" || procurementMethod === "邀请招标"
  const requirePublicVendorSelection =
    procurementMethod === "询比采购" || procurementMethod === "竞价采购" || procurementMethod === "谈判采购" || procurementMethod === "公开招标"
  const showLotDivisionReason = procurementMethod === "公开招标" || procurementMethod === "邀请招标"
  const canShowNonPublic = showPublicVendorSelection && (lockPublicVendorSelection || form.publicVendorSelection === false)
  const showControlPrice = form.hasControlPrice === true

  useEffect(() => {
    if (!lockPublicVendorSelection) return
    if (form.publicVendorSelection === false) return
    setForm((s) => ({ ...s, publicVendorSelection: false }))
  }, [form.publicVendorSelection, lockPublicVendorSelection])

  const load = useCallback(async () => {
    if (mode !== "edit" || !id) return
    setLoading(true)
    const r = await api.get<ServiceRequestRecord>(`/api/requests/${id}`, undefined, { user })
    if (r.success === false) {
      pushToast({ title: "加载失败", description: String(r.error), tone: "danger", ttlMs: 3500 })
      setLoading(false)
      return
    }
    setRequestNo(r.data.requestNo)
    setForm({
      fundingChannel: r.data.fundingChannel,
      applicantCompany: r.data.applicantCompany,
      applicantDepartment: r.data.applicantDepartment,
      projectName: r.data.projectName,
      needDate: r.data.needDate,
      procurementMethod: r.data.procurementMethod,
      projectType: r.data.projectType,
      publicVendorSelection: r.data.publicVendorSelection,
      singleSourceReason: r.data.singleSourceReason,
      hasControlPrice: r.data.hasControlPrice,
      controlPriceWoTax: r.data.controlPriceWoTax,
      vendorInviteReason: r.data.vendorInviteReason,
      invitedVendors: r.data.invitedVendors,
      budgetProjectCBS: r.data.budgetProjectCBS,
      projectOverview: r.data.projectOverview,
      vendorSelectionScope: r.data.vendorSelectionScope,
      vendorSelectionRequirements: r.data.vendorSelectionRequirements,
      mainTechnicalRequirements: r.data.mainTechnicalRequirements,
      implementationLocation: r.data.implementationLocation,
      serviceProcurementPeriod: r.data.serviceProcurementPeriod,
      remark: r.data.remark,
      contractSubject: r.data.contractSubject,
      applicant: r.data.applicant,
      contactInfo: r.data.contactInfo,
      lotDivisionReason: r.data.lotDivisionReason,
      attachments: r.data.attachments,
    })
    setLoading(false)
  }, [id, mode, pushToast, user])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let canceled = false
    const run = async () => {
      const res = await api.get<{ fundingChannels: FundingChannel[]; procurementMethods: ProcurementMethod[]; projectTypes: ProjectType[] }>(
        "/api/meta/options",
      )
      if (canceled) return
      if (res.success === false) return
      setFundingOptions(res.data.fundingChannels)
      setProcurementOptions(res.data.procurementMethods)
      setProjectTypeOptions(res.data.projectTypes)
    }
    run()
    return () => {
      canceled = true
    }
  }, [])

  useEffect(() => {
    let canceled = false
    const run = async () => {
      const res = await api.get<string[]>("/api/meta/companies")
      if (canceled) return
      if (res.success === false) return
      setCompanyOptions(res.data)
    }
    run()
    return () => {
      canceled = true
    }
  }, [])

  useEffect(() => {
    let canceled = false
    const run = async () => {
      if (!form.applicantCompany) {
        setDepartmentOptions([])
        return
      }
      const res = await api.get<string[]>("/api/meta/departments", { company: form.applicantCompany })
      if (canceled) return
      if (res.success === false) {
        setDepartmentOptions([])
        return
      }
      setDepartmentOptions(res.data)
      if (res.data.length > 0 && !res.data.includes(form.applicantDepartment)) {
        setForm((s) => ({ ...s, applicantDepartment: "" }))
      }
    }
    run()
    return () => {
      canceled = true
    }
  }, [form.applicantCompany, form.applicantDepartment])

  const requiredMissing = useMemo(() => {
    const missing: string[] = []
    const must = (ok: boolean, name: string) => {
      if (!ok) missing.push(name)
    }
    must(!!form.fundingChannel, "资金渠道")
    must(!!form.applicantCompany, "申请单位")
    must(!!form.applicantDepartment, "申请部门")
    must(!!form.projectName, "项目名称")
    must(!!form.needDate, "需求时间")
    must(!!form.procurementMethod, "采购方式")
    must(!!form.projectType, "项目类型")
    if (requirePublicVendorSelection) must(form.publicVendorSelection !== null, "公开选商")
    must(form.hasControlPrice !== null, "是否设控制价")
    if (showControlPrice) must(!!form.controlPriceWoTax, "控制价（不含税，万元）")
    must(hasAttachment(form.attachments, "采购依据"), "采购依据")
    must(hasAttachment(form.attachments, "技术方案及批复"), "技术方案及批复")
    must(hasAttachment(form.attachments, "采购需求"), "采购需求")
    if (canShowNonPublic) {
      if (procurementMethod === "直接采购") must(!!form.singleSourceReason, "单一来源选商理由")
      must(!!form.vendorInviteReason, "供应商邀请理由及产生方式")
      must(form.invitedVendors.length > 0, "拟邀请参加选商的供应商")
      must(!!form.budgetProjectCBS, "预算项目(CBS)")
      must(hasAttachment(form.attachments, "资格材料"), "资格材料")
      must(hasAttachment(form.attachments, "审计报告"), "审计报告")
    }
    must(!!form.projectOverview, "项目概况")
    must(!!form.vendorSelectionScope, "选商范围")
    must(!!form.vendorSelectionRequirements, "选商要求")
    must(!!form.implementationLocation, "实施地点")
    must(!!form.serviceProcurementPeriod, "服务（采购）期限")
    if (showLotDivisionReason) must(!!form.lotDivisionReason, "标段（标包）划分及标段划分理由")
    must(!!form.contractSubject, "签约主体")
    must(!!form.applicant, "申请人")
    must(!!form.contactInfo, "联系方式")
    return missing
  }, [form, canShowNonPublic, procurementMethod, requirePublicVendorSelection, showControlPrice, showLotDivisionReason])

  const missingSet = useMemo(() => new Set(requiredMissing), [requiredMissing])
  const [showMissingTips, setShowMissingTips] = useState(false)

  const fieldIdByLabel = useMemo(() => {
    return {
      资金渠道: "sr_f_fundingChannel",
      申请单位: "sr_f_applicantCompany",
      申请部门: "sr_f_applicantDepartment",
      项目名称: "sr_f_projectName",
      需求时间: "sr_f_needDate",
      采购方式: "sr_f_procurementMethod",
      项目类型: "sr_f_projectType",
      公开选商: "sr_f_publicVendorSelection",
      单一来源选商理由: "sr_f_singleSourceReason",
      是否设控制价: "sr_f_hasControlPrice",
      "控制价（不含税，万元）": "sr_f_controlPriceWoTax",
      采购依据: "sr_a_basis",
      "技术方案及批复": "sr_a_scheme",
      采购需求: "sr_a_demand",
      "供应商邀请理由及产生方式": "sr_f_vendorInviteReason",
      "拟邀请参加选商的供应商": "sr_f_invitedVendors",
      "预算项目(CBS)": "sr_f_budgetProjectCBS",
      资格材料: "sr_a_qual",
      审计报告: "sr_a_audit",
      项目概况: "sr_f_projectOverview",
      选商范围: "sr_f_vendorSelectionScope",
      选商要求: "sr_f_vendorSelectionRequirements",
      实施地点: "sr_f_implementationLocation",
      "服务（采购）期限": "sr_f_serviceProcurementPeriod",
      "标段（标包）划分及标段划分理由": "sr_f_lotDivisionReason",
      签约主体: "sr_f_contractSubject",
      申请人: "sr_f_applicant",
      联系方式: "sr_f_contactInfo",
    } as Record<string, string>
  }, [])

  const scrollToMissing = useCallback(
    (label: string) => {
      const id = fieldIdByLabel[label]
      if (!id) return
      const el = document.getElementById(id)
      if (!el) return
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      const focusable = el.querySelector("input,textarea,select,button") as HTMLElement | null
      focusable?.focus?.()
    },
    [fieldIdByLabel],
  )


  const save = async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setMutating(true)
    try {
    if (mode === "new") {
      const res = await api.post<ServiceRequestRecord>("/api/requests", { ...form, clientRequestId: clientRequestIdRef.current }, { user })
      if (res.success === false) {
        pushToast({ title: "保存失败", description: String(res.error), tone: "danger", ttlMs: 3500 })
        return
      }
      pushToast({ title: "已保存为草稿", tone: "success", ttlMs: 2000 })
      navigate(`/requests/${res.data.id}/edit`, { replace: true })
      return
    }

    if (!id) return
    const res = await api.put<ServiceRequestRecord>(`/api/requests/${id}`, form, { user })
    if (res.success === false) {
      pushToast({ title: "保存失败", description: String(res.error), tone: "danger", ttlMs: 3500 })
      return
    }
    pushToast({ title: "已保存", tone: "success", ttlMs: 1800 })
    } finally {
      inFlightRef.current = false
      setMutating(false)
    }
  }

  const submit = async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setMutating(true)
    try {
    if (requiredMissing.length > 0) {
      setShowMissingTips(true)
      scrollToMissing(requiredMissing[0])
      pushToast({
        title: "缺少必填项",
        description: `请先补齐：${requiredMissing[0]}`,
        tone: "danger",
        ttlMs: 4500,
      })
      return
    }

    if (mode === "new") {
      const created = await api.post<ServiceRequestRecord>("/api/requests", { ...form, clientRequestId: clientRequestIdRef.current }, { user })
      if (created.success === false) {
        pushToast({ title: "提交失败", description: String(created.error), tone: "danger", ttlMs: 3500 })
        return
      }
      const transitioned = await api.post<ServiceRequestRecord>(`/api/requests/${created.data.id}/transition`, { action: "submit" }, { user })
      if (transitioned.success === false) {
        pushToast({ title: "提交失败", description: String(transitioned.error), tone: "danger", ttlMs: 3500 })
        return
      }
      pushToast({ title: "已提交审批", tone: "success", ttlMs: 2500 })
      navigate(`/requests/${created.data.id}`)
      return
    }

    if (!id) return
    const transitioned = await api.post<ServiceRequestRecord>(`/api/requests/${id}/transition`, { action: "submit" }, { user })
    if (transitioned.success === false) {
      const msg = transitioned.error === "MissingFields" ? "提交失败：缺少必填项" : "提交失败"
      pushToast({ title: msg, description: JSON.stringify(transitioned.data || transitioned.error), tone: "danger", ttlMs: 4500 })
      return
    }
    pushToast({ title: "已提交审批", tone: "success", ttlMs: 2500 })
    navigate(`/requests/${id}`)
    } finally {
      inFlightRef.current = false
      setMutating(false)
    }
  }

  const uploadMock = (group: AttachmentGroup, subtype?: AttachmentSubtype) => {
    const input = document.createElement("input")
    input.type = "file"
    input.onchange = () => {
      const f = input.files?.[0]
      if (!f) return
      const meta: FileMeta = {
        id: globalThis.crypto.randomUUID(),
        name: f.name,
        size: f.size,
        group,
        subtype,
        uploadedAt: new Date().toISOString(),
      }
      setForm((s) => ({ ...s, attachments: [meta, ...s.attachments] }))
      pushToast({ title: "已添加附件", description: f.name, tone: "success", ttlMs: 1800 })
    }
    input.click()
  }

  const removeAttachment = (id: string) => {
    setForm((s) => ({ ...s, attachments: s.attachments.filter((a) => a.id !== id) }))
  }

  const backUrl = sessionStorage.getItem("sr_last_list_url") || "/todo"

  const assistText = useMemo(() => {
    const pieces: string[] = []
    if (missingSet.size === 0) {
      pieces.push("当前已满足提交条件。")
      return pieces.join("\n")
    }
    const top = requiredMissing.slice(0, 6)
    pieces.push("建议优先补齐：" + top.join("、") + (requiredMissing.length > 6 ? " …" : ""))

    if (missingSet.has("项目概况")) {
      pieces.push("\n【项目概况模板】")
      pieces.push(`1. 背景：\n2. 目标：\n3. 范围：\n4. 风险：\n5. 交付物：\n6. 里程碑：`)
    }
    if (missingSet.has("选商要求")) {
      pieces.push("\n【选商要求模板】")
      pieces.push(`- 资质要求：\n- 业绩要求：\n- 人员要求：\n- 响应与服务：\n- 验收标准：`)
    }
    if (missingSet.has("选商范围")) {
      pieces.push("\n【选商范围模板】")
      pieces.push(`- 区域范围：\n- 行业/专业范围：\n- 候选池来源：`) 
    }
    if (missingSet.has("供应商邀请理由及产生方式")) {
      pieces.push("\n【邀请理由模板】")
      pieces.push(`- 产生方式：\n- 合规性说明：\n- 必要性与紧急性：\n- 可替代方案对比：`)
    }
    return pieces.join("\n")
  }, [missingSet, requiredMissing])

  return (
    <div className="mx-auto w-full">
      <RightAsideSlot>
        <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">可执行动作</div>
          <Divider className="my-4" />
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={save} disabled={loading || mutating}>
              保存
            </Button>
            <Button variant="primary" size="sm" className="flex-1" onClick={submit} disabled={loading || mutating}>
              提交
            </Button>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-semibold">辅助填报</div>
          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">缺失项可点击快速定位</div>

          {requiredMissing.length > 0 ? (
            <div className="mt-3">
              <div className="text-xs font-medium text-zinc-700 dark:text-zinc-200">缺失（{requiredMissing.length}）</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {requiredMissing.slice(0, 14).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="rounded-full border border-zinc-200/70 bg-white/60 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100/70 dark:border-zinc-900/70 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/50"
                    onClick={() => {
                      setShowMissingTips(true)
                      scrollToMissing(m)
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {requiredMissing.length > 14 ? (
                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">其余 {requiredMissing.length - 14} 项未展示</div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200">
              已满足提交条件。
            </div>
          )}

          <Divider className="my-4" />
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-200">智能化辅助</div>
          <div className="mt-2 whitespace-pre-wrap rounded-xl border border-zinc-200/70 bg-white/60 p-3 text-xs text-zinc-700 dark:border-zinc-900/70 dark:bg-zinc-950/40 dark:text-zinc-200">
            {assistText}
          </div>
          <div className="mt-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={async () => {
                await navigator.clipboard.writeText(assistText)
                pushToast({ title: "已复制", tone: "success", ttlMs: 1500 })
              }}
              aria-label="复制辅助内容"
            >
              复制建议
            </Button>
          </div>
        </Card>
        </div>
      </RightAsideSlot>

      <Card className="p-5">
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
              <div className="truncate text-lg font-semibold">{mode === "new" ? "新建需求" : `编辑草稿 ${requestNo || ""}`}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <Button variant="secondary" onClick={save} disabled={loading || mutating}>
              <Save className="h-4 w-4" />
              保存
            </Button>
            <Button variant="primary" onClick={submit} disabled={loading || mutating}>
              <Send className="h-4 w-4" />
              提交
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-4">
          <Card className="p-5">
            <div className="text-sm font-semibold">基本信息</div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <InputField
                label="项目名称*"
                value={form.projectName}
                onChange={(v) => setForm((s) => ({ ...s, projectName: v }))}
                help="填写项目的正式名称，建议与立项/合同/预算保持一致，便于检索与对账。"
                className="md:col-span-2"
                fieldId={fieldIdByLabel["项目名称"]}
                error={showMissingTips && missingSet.has("项目名称") ? "请填写" : undefined}
              />
              <SelectField
                label="申请单位*"
                value={form.applicantCompany}
                onChange={(v) =>
                  setForm((s) => ({
                    ...s,
                    applicantCompany: v,
                    applicantDepartment: "",
                  }))
                }
                options={["", ...companyOptions]}
                help="选择申请单位。会联动可选的作业区/部门，并决定该单据的归属范围。"
                fieldId={fieldIdByLabel["申请单位"]}
                error={showMissingTips && missingSet.has("申请单位") ? "请填写" : undefined}
              />
              <SelectField
                label="申请部门*"
                value={form.applicantDepartment}
                onChange={(v) => setForm((s) => ({ ...s, applicantDepartment: v }))}
                options={["", ...departmentOptions]}
                help="从申请单位对应的作业区/部门中选择。"
                fieldId={fieldIdByLabel["申请部门"]}
                error={showMissingTips && missingSet.has("申请部门") ? "请填写" : undefined}
              />
              <SelectField
                label="资金渠道*"
                value={form.fundingChannel}
                onChange={(v) => setForm((s) => ({ ...s, fundingChannel: v as FundingChannel | "" }))}
                options={["", ...fundingOptions]}
                help="选择资金来源口径，用于后续预算与审批判断。"
                fieldId={fieldIdByLabel["资金渠道"]}
                error={showMissingTips && missingSet.has("资金渠道") ? "请填写" : undefined}
              />
              <InputField
                label="需求时间*"
                type="date"
                value={form.needDate}
                onChange={(v) => setForm((s) => ({ ...s, needDate: v }))}
                help="选择本次服务需求的提出/生效日期，用于排期与审批时效判断。"
                fieldId={fieldIdByLabel["需求时间"]}
                error={showMissingTips && missingSet.has("需求时间") ? "请选择" : undefined}
              />
              <SelectField
                label="采购方式*"
                value={form.procurementMethod}
                onChange={(v) =>
                  setForm((s) => {
                    const next = v as ProcurementMethod | ""
                    const pm = String(next || "").trim()
                    const prevPm = String(s.procurementMethod || "").trim()
                    const prevLock = prevPm === "直接采购" || prevPm === "邀请招标"
                    const lock = pm === "直接采购" || pm === "邀请招标"
                    const isTender = pm === "公开招标" || pm === "邀请招标"
                    return {
                      ...s,
                      procurementMethod: next,
                      publicVendorSelection: pm === "" ? null : lock ? false : prevLock ? null : s.publicVendorSelection,
                      singleSourceReason: pm === "直接采购" ? s.singleSourceReason : "",
                      lotDivisionReason: isTender ? s.lotDivisionReason : "",
                    }
                  })
                }
                options={["", ...procurementOptions]}
                help="选择拟采用的采购方式；如不确定，先按业务建议选择，后续可在草稿中调整。"
                fieldId={fieldIdByLabel["采购方式"]}
                error={showMissingTips && missingSet.has("采购方式") ? "请选择" : undefined}
              />
              <SelectField
                label="项目类型*"
                value={form.projectType}
                onChange={(v) => setForm((s) => ({ ...s, projectType: v as ProjectType | "" }))}
                options={["", ...projectTypeOptions]}
                help="选择需求所属分类，用于后续流程与统计口径。"
                fieldId={fieldIdByLabel["项目类型"]}
                error={showMissingTips && missingSet.has("项目类型") ? "请选择" : undefined}
              />
              {showPublicVendorSelection ? (
                <SelectField
                  label={lockPublicVendorSelection ? "公开选商" : "公开选商*"}
                  value={form.publicVendorSelection === null ? "" : form.publicVendorSelection ? "是" : "否"}
                  onChange={(v) => setForm((s) => ({ ...s, publicVendorSelection: v === "" ? null : v === "是" }))}
                  options={["", "是", "否"]}
                  help="选择是否公开选商；选“否”会开启非公开选商信息的必填项。"
                  fieldId={fieldIdByLabel["公开选商"]}
                  error={showMissingTips && missingSet.has("公开选商") ? "请选择" : undefined}
                  disabled={lockPublicVendorSelection}
                />
              ) : null}
              <SelectField
                label="是否设控制价*"
                value={form.hasControlPrice === null ? "" : form.hasControlPrice ? "是" : "否"}
                onChange={(v) =>
                  setForm((s) => ({
                    ...s,
                    hasControlPrice: v === "" ? null : v === "是",
                    controlPriceWoTax: v === "是" ? s.controlPriceWoTax : "",
                  }))
                }
                options={["", "是", "否"]}
                help="是否有不含税控制价；选择“是”后需填写控制价金额。"
                fieldId={fieldIdByLabel["是否设控制价"]}
                error={showMissingTips && missingSet.has("是否设控制价") ? "请选择" : undefined}
              />
              {showControlPrice ? (
                <InputField
                  label="控制价（不含税，万元）*"
                  value={form.controlPriceWoTax}
                  onChange={(v) => setForm((s) => ({ ...s, controlPriceWoTax: v }))}
                  placeholder="例如：148.1200"
                  help="填写不含税控制价（单位：万元），可保留 4 位小数。"
                  fieldId={fieldIdByLabel["控制价（不含税，万元）"]}
                  error={showMissingTips && missingSet.has("控制价（不含税，万元）") ? "请填写" : undefined}
                />
              ) : (
                <div />
              )}
            </div>
          </Card>

          <Card className="mt-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">附件信息</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">支持 pdf/doc/docx/jpg/jpeg/png/xlsx/xls，单文件 ≤10MB</div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <AttachCard
                title="采购依据*"
                subtitle="子类：立项文件/计划文件/费用文件/项目说明/预算审批意见/预算表/其他"
                onUpload={() => uploadMock("采购依据", "立项文件")}
                help="上传本次需求的依据材料（立项/计划/预算等），至少 1 份。"
                fieldId={fieldIdByLabel["采购依据"]}
                error={showMissingTips && missingSet.has("采购依据") ? "请上传至少 1 份" : undefined}
              />
              <AttachCard
                title="技术方案及批复*"
                subtitle="子类：待定"
                onUpload={() => uploadMock("技术方案及批复", "待定")}
                help="上传技术方案及相关批复文件；如无批复，先上传方案或说明材料。"
                fieldId={fieldIdByLabel["技术方案及批复"]}
                error={showMissingTips && missingSet.has("技术方案及批复") ? "请上传至少 1 份" : undefined}
              />
              <AttachCard
                title="采购需求*"
                subtitle="子类：招标需求表/其他"
                onUpload={() => uploadMock("采购需求", "招标需求表")}
                help="上传采购需求文件（如招标需求表/规格书等），用于评审与选商。"
                fieldId={fieldIdByLabel["采购需求"]}
                error={showMissingTips && missingSet.has("采购需求") ? "请上传至少 1 份" : undefined}
              />
            </div>

            <Divider className="my-4" />

            <div className="space-y-2">
              {form.attachments.length === 0 ? (
                <div className="text-xs text-zinc-500 dark:text-zinc-400">暂无附件</div>
              ) : (
                form.attachments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-900 dark:bg-zinc-950"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{a.name}</div>
                      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{a.group}{a.subtype ? ` / ${a.subtype}` : ""}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{Math.max(1, Math.round(a.size / 1024))} KB</div>
                      <Button variant="ghost" size="sm" onClick={() => removeAttachment(a.id)}>
                        移除
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {canShowNonPublic ? (
            <Card className="mt-4 p-5">
              <div className="text-sm font-semibold">非公开选商信息</div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {procurementMethod === "直接采购" ? (
                  <SelectField
                    label="单一来源选商理由*"
                    value={form.singleSourceReason}
                    onChange={(v) => setForm((s) => ({ ...s, singleSourceReason: v }))}
                    options={[
                      "",
                      "(一)涉及商业秘密，不适宜竟争性采购",
                      "(二)不可预见的特殊情况需要紧急采购",
                      "(三)不可替代技术",
                      "(四)有原厂配套要求",
                      "(五)响应人有且仅有1家",
                      "(六)创新需要",
                      "(七)明确的其他情形",
                    ]}
                    help="选择单一来源采购的适用情形，用于合规留痕。"
                    className="md:col-span-2"
                    fieldId={fieldIdByLabel["单一来源选商理由"]}
                    error={showMissingTips && missingSet.has("单一来源选商理由") ? "请选择" : undefined}
                  />
                ) : null}
                <TextareaField
                  label="供应商邀请理由及产生方式*"
                  value={form.vendorInviteReason}
                  onChange={(v) => setForm((s) => ({ ...s, vendorInviteReason: v }))}
                  help="说明为何邀请该类供应商、来源渠道、产生过程与必要性。"
                className="md:col-span-2"
                fieldId={fieldIdByLabel["供应商邀请理由及产生方式"]}
                error={showMissingTips && missingSet.has("供应商邀请理由及产生方式") ? "请填写" : undefined}
                />
              <div id={fieldIdByLabel["拟邀请参加选商的供应商"]} className="scroll-mt-24">
                <LabelWithHelp
                  label="拟邀请参加选商的供应商*"
                  help="至少选择 1 家拟邀请供应商；可多选，重复会自动去重。"
                  error={showMissingTips && missingSet.has("拟邀请参加选商的供应商") ? "请至少选择 1 家" : undefined}
                />
                  <Select
                    className="mt-2"
                    value=""
                    onChange={(e) => {
                      const v = e.target.value
                      if (!v) return
                      setForm((s) => ({ ...s, invitedVendors: Array.from(new Set([...s.invitedVendors, v])) }))
                    }}
                  >
                    <option value="">选择添加</option>
                    {vendorMock.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </Select>
                {showMissingTips && missingSet.has("拟邀请参加选商的供应商") ? (
                  <div className="mt-1 text-xs text-rose-600/70 dark:text-rose-300/70">请至少选择 1 家</div>
                ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.invitedVendors.map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        {v}
                        <button
                          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
                          onClick={() => setForm((s) => ({ ...s, invitedVendors: s.invitedVendors.filter((x) => x !== v) }))}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <InputField
                  label="预算项目(CBS)*"
                  value={form.budgetProjectCBS}
                  onChange={(v) => setForm((s) => ({ ...s, budgetProjectCBS: v }))}
                  help="填写预算项目/科目编码（CBS），用于预算归集与审批校验。"
                  fieldId={fieldIdByLabel["预算项目(CBS)"]}
                  error={showMissingTips && missingSet.has("预算项目(CBS)") ? "请填写" : undefined}
                />
                <div className="grid grid-cols-1 gap-3">
                  <AttachCard
                    title="资格材料*"
                    subtitle="上传资质材料"
                    onUpload={() => uploadMock("资格材料")}
                    compact
                    help="上传供应商资质/证照/能力证明等材料。"
                    fieldId={fieldIdByLabel["资格材料"]}
                    error={showMissingTips && missingSet.has("资格材料") ? "请上传至少 1 份" : undefined}
                  />
                  <AttachCard
                    title="审计报告*"
                    subtitle="上传审计报告"
                    onUpload={() => uploadMock("审计报告")}
                    compact
                    help="上传供应商最近年度审计报告或财务证明材料。"
                    fieldId={fieldIdByLabel["审计报告"]}
                    error={showMissingTips && missingSet.has("审计报告") ? "请上传至少 1 份" : undefined}
                  />
                </div>
              </div>
            </Card>
          ) : null}

          <Card className="mt-4 p-5">
            <div className="text-sm font-semibold">采购需求信息</div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextareaField
                label="项目概况*"
                value={form.projectOverview}
                onChange={(v) => setForm((s) => ({ ...s, projectOverview: v }))}
                help="简述背景、目标、范围、交付物与关键里程碑（建议 3-8 句话）。"
                className="md:col-span-2"
                fieldId={fieldIdByLabel["项目概况"]}
                error={showMissingTips && missingSet.has("项目概况") ? "请填写" : undefined}
              />
              <TextareaField
                label="选商范围*"
                value={form.vendorSelectionScope}
                onChange={(v) => setForm((s) => ({ ...s, vendorSelectionScope: v }))}
                help="描述供应商覆盖范围（区域/行业/资质级别等），便于确定候选池。"
                className="md:col-span-2"
                fieldId={fieldIdByLabel["选商范围"]}
                error={showMissingTips && missingSet.has("选商范围") ? "请填写" : undefined}
              />
              <TextareaField
                label="选商要求*"
                value={form.vendorSelectionRequirements}
                onChange={(v) => setForm((s) => ({ ...s, vendorSelectionRequirements: v }))}
                help="填写对供应商的硬性要求（资质、经验、人员、案例、响应时效等）。"
                className="md:col-span-2"
                fieldId={fieldIdByLabel["选商要求"]}
                error={showMissingTips && missingSet.has("选商要求") ? "请填写" : undefined}
              />
              <TextareaField
                label="主要技术要求"
                value={form.mainTechnicalRequirements}
                onChange={(v) => setForm((s) => ({ ...s, mainTechnicalRequirements: v }))}
                help="如涉及技术方案/接口/性能/验收标准，在此补充；不需要可留空。"
                className="md:col-span-2"
              />
              <InputField
                label="实施地点*"
                value={form.implementationLocation}
                onChange={(v) => setForm((s) => ({ ...s, implementationLocation: v }))}
                help="填写服务实施的具体地点（城市/场站/作业区等），用于资源排布与报价。"
                fieldId={fieldIdByLabel["实施地点"]}
                error={showMissingTips && missingSet.has("实施地点") ? "请填写" : undefined}
              />
              <DateRangeField
                label="服务（采购）期限*"
                value={form.serviceProcurementPeriod}
                onChange={(v) => setForm((s) => ({ ...s, serviceProcurementPeriod: v }))}
                help="选择服务起止日期范围，用于排期与采购周期管理。"
                fieldId={fieldIdByLabel["服务（采购）期限"]}
                error={showMissingTips && missingSet.has("服务（采购）期限") ? "请选择" : undefined}
              />
              <TextareaField
                label="备注"
                value={form.remark}
                onChange={(v) => setForm((s) => ({ ...s, remark: v }))}
                help="补充说明与约束条件（如进场要求、合规要求、特殊风险等）。"
                className="md:col-span-2"
              />
              {showLotDivisionReason ? (
                <TextareaField
                  label="标段（标包）划分及标段划分理由*"
                  value={form.lotDivisionReason}
                  onChange={(v) => setForm((s) => ({ ...s, lotDivisionReason: v }))}
                  help="如需要分标段/标包，说明划分方式、边界与理由；无则可留空。"
                  className="md:col-span-2"
                  fieldId={fieldIdByLabel["标段（标包）划分及标段划分理由"]}
                  error={showMissingTips && missingSet.has("标段（标包）划分及标段划分理由") ? "请填写" : undefined}
                />
              ) : null}
              <InputField
                label="签约主体*"
                value={form.contractSubject}
                onChange={(v) => setForm((s) => ({ ...s, contractSubject: v }))}
                help="填写最终合同的签署主体（公司/分公司/单位全称）。"
                fieldId={fieldIdByLabel["签约主体"]}
                error={showMissingTips && missingSet.has("签约主体") ? "请填写" : undefined}
              />
              <InputField
                label="申请人*"
                value={form.applicant}
                onChange={(v) => setForm((s) => ({ ...s, applicant: v }))}
                help="默认当前登录用户；如代填请填写实际申请人姓名。"
                fieldId={fieldIdByLabel["申请人"]}
                error={showMissingTips && missingSet.has("申请人") ? "请填写" : undefined}
              />
              <InputField
                label="联系方式*"
                value={form.contactInfo}
                onChange={(v) => setForm((s) => ({ ...s, contactInfo: v }))}
                help="填写可联系到申请人的电话/手机（建议手机）。"
                fieldId={fieldIdByLabel["联系方式"]}
                error={showMissingTips && missingSet.has("联系方式") ? "请填写" : undefined}
              />
            </div>
          </Card>
      </div>
    </div>
  )
}

function hasAttachment(list: FileMeta[], group: AttachmentGroup) {
  return list.some((a) => a.group === group)
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type,
  className,
  help,
  fieldId,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  className?: string
  help?: string
  fieldId?: string
  error?: string
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const openPicker = () => {
    const el = inputRef.current
    if (!el) return
    const anyEl = el as unknown as { showPicker?: () => void }
    if (anyEl.showPicker) anyEl.showPicker()
    else {
      el.focus()
      el.click()
    }
  }

  return (
    <div id={fieldId} className={(className ? className + " " : "") + "scroll-mt-24"}>
      <LabelWithHelp label={label} help={help} error={error} />
      {type === "date" ? (
        <div className="mt-2 cursor-pointer" onClick={openPicker}>
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            type={type}
            aria-invalid={!!error}
            className={(error ? "border-rose-300/70 focus-visible:ring-rose-500/30 dark:border-rose-400/30 " : "") + "cursor-pointer"}
          />
        </div>
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          aria-invalid={!!error}
          className={
            "mt-2 " +
            (error ? "border-rose-300/70 focus-visible:ring-rose-500/30 dark:border-rose-400/30" : "")
          }
        />
      )}
      {error ? <div className="mt-1 text-xs text-rose-600/70 dark:text-rose-300/70">{error}</div> : null}
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  className,
  help,
  fieldId,
  error,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  className?: string
  help?: string
  fieldId?: string
  error?: string
  disabled?: boolean
}) {
  return (
    <div id={fieldId} className={(className ? className + " " : "") + "scroll-mt-24"}>
      <LabelWithHelp label={label} help={help} error={error} />
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        disabled={disabled}
        className={
          "mt-2 " +
          (error ? "border-rose-300/70 focus-visible:ring-rose-500/30 dark:border-rose-400/30" : "")
        }
      >
        {options.map((o) => (
          <option key={o || "__empty"} value={o}>
            {o || "请选择"}
          </option>
        ))}
      </Select>
      {error ? <div className="mt-1 text-xs text-rose-600/70 dark:text-rose-300/70">{error}</div> : null}
    </div>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  className,
  help,
  fieldId,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  className?: string
  help?: string
  fieldId?: string
  error?: string
}) {
  return (
    <div id={fieldId} className={(className ? className + " " : "") + "scroll-mt-24"}>
      <LabelWithHelp label={label} help={help} error={error} />
      <textarea
        className={
          "mt-2 min-h-[88px] w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 " +
          "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 " +
          (error ? "border-rose-300/70 focus-visible:ring-rose-500/30 dark:border-rose-400/30" : "")
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      {error ? <div className="mt-1 text-xs text-rose-600/70 dark:text-rose-300/70">{error}</div> : null}
    </div>
  )
}

function DateRangeField({
  label,
  value,
  onChange,
  help,
  fieldId,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  help?: string
  fieldId?: string
  error?: string
}) {
  const startRef = useRef<HTMLInputElement | null>(null)
  const endRef = useRef<HTMLInputElement | null>(null)
  const parsed = useMemo(() => {
    const raw = String(value || "")
    const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
    const trimmed = raw.trim()

    if (trimmed.includes("~")) {
      const parts = trimmed.split("~")
      const left = (parts[0] || "").trim()
      const right = (parts[1] || "").trim()
      const start = left && isDate(left) ? left : ""
      const end = right && isDate(right) ? right : ""
      return { start, end }
    }

    const start = trimmed && isDate(trimmed) ? trimmed : ""
    const end = ""
    return { start, end }
  }, [value])

  const compose = (start: string, end: string) => {
    if (!start && !end) return ""
    if (start && end) return `${start} ~ ${end}`
    return start || end
  }

  const openStart = () => {
    const el = startRef.current
    if (!el) return
    const anyEl = el as unknown as { showPicker?: () => void }
    if (anyEl.showPicker) anyEl.showPicker()
    else {
      el.focus()
      el.click()
    }
  }
  const openEnd = () => {
    const el = endRef.current
    if (!el) return
    const anyEl = el as unknown as { showPicker?: () => void }
    if (anyEl.showPicker) anyEl.showPicker()
    else {
      el.focus()
      el.click()
    }
  }

  return (
    <div id={fieldId} className="scroll-mt-24">
      <LabelWithHelp label={label} help={help} error={error} />
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="cursor-pointer" onClick={openStart}>
          <Input
            ref={startRef}
            type="date"
            value={parsed.start}
            onChange={(e) => onChange(compose(e.target.value, parsed.end))}
            aria-invalid={!!error}
            className={(error ? "border-rose-300/70 focus-visible:ring-rose-500/30 dark:border-rose-400/30 " : "") + "cursor-pointer"}
          />
        </div>
        <div className="cursor-pointer" onClick={openEnd}>
          <Input
            ref={endRef}
            type="date"
            value={parsed.end}
            onChange={(e) => onChange(compose(parsed.start, e.target.value))}
            aria-invalid={!!error}
            className={(error ? "border-rose-300/70 focus-visible:ring-rose-500/30 dark:border-rose-400/30 " : "") + "cursor-pointer"}
          />
        </div>
      </div>
      {error ? <div className="mt-1 text-xs text-rose-600/70 dark:text-rose-300/70">{error}</div> : null}
    </div>
  )
}

function LabelWithHelp({ label, help, error }: { label: string; help?: string; error?: string }) {
  return (
    <div className="flex items-center gap-1">
      <label className={"text-xs font-medium " + (error ? "text-rose-700/80 dark:text-rose-200/80" : "text-zinc-600 dark:text-zinc-300")}>
        {label}
      </label>
      {help ? (
        <span className="group relative inline-flex">
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label={`${label} 填写说明`}
          >
            <CircleHelp className="h-4 w-4" />
          </button>
          <span className="pointer-events-none absolute left-0 top-7 z-[2000] hidden w-[260px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-lg ring-1 ring-zinc-900/5 group-hover:block group-focus-within:block dark:border-zinc-900 dark:bg-zinc-950 dark:text-zinc-200">
            {help}
          </span>
        </span>
      ) : null}
    </div>
  )
}

function AttachCard({
  title,
  subtitle,
  onUpload,
  compact,
  help,
  fieldId,
  error,
}: {
  title: string
  subtitle: string
  onUpload: () => void
  compact?: boolean
  help?: string
  fieldId?: string
  error?: string
}) {
  return (
    <div
      id={fieldId}
      className={
        "scroll-mt-24 rounded-2xl border border-zinc-200/70 bg-white/60 p-4 dark:border-zinc-900/70 dark:bg-zinc-950/40 " +
        (error ? "border-rose-300/70 dark:border-rose-400/30" : "")
      }
    >
      <div className="flex items-center gap-1 text-sm font-semibold">
        <span>{title}</span>
        {help ? (
          <span className="group relative inline-flex">
            <button
              type="button"
              className="inline-flex h-5 w-5 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label={`${title} 填写说明`}
            >
              <CircleHelp className="h-4 w-4" />
            </button>
            <span className="pointer-events-none absolute left-0 top-7 z-[2000] hidden w-[260px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-normal text-zinc-700 shadow-lg ring-1 ring-zinc-900/5 group-hover:block group-focus-within:block dark:border-zinc-900 dark:bg-zinc-950 dark:text-zinc-200">
              {help}
            </span>
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</div>
      <div className="mt-3">
        <Button variant="secondary" onClick={onUpload}>
          <Paperclip className="h-4 w-4" />
          点击上传
        </Button>
      </div>
      {error ? <div className="mt-2 text-xs text-rose-600/70 dark:text-rose-300/70">{error}</div> : null}
    </div>
  )
}

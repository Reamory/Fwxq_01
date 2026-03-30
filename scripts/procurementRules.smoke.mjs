const base = "http://localhost:3001"
const now = new Date().toISOString()

async function createAndSubmit(form) {
  const id = crypto.randomUUID()
  await fetch(base + "/api/requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...form, clientRequestId: id }),
  })

  const transition = await fetch(base + `/api/requests/${id}/transition`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "submit" }),
  })

  const body = await transition.json().catch(() => null)
  return { status: transition.status, body }
}

const baseForm = {
  fundingChannel: "投资",
  applicantCompany: "山东公司",
  applicantDepartment: "潍坊作业区",
  projectName: "采购方式联动测试",
  needDate: "2026-03-30",
  projectType: "工程服务类",
  publicVendorSelection: null,
  singleSourceReason: "",
  hasControlPrice: false,
  controlPriceWoTax: "",
  vendorInviteReason: "x",
  invitedVendors: ["华北供应商A"],
  budgetProjectCBS: "CBS-001",
  projectOverview: "x",
  vendorSelectionScope: "x",
  vendorSelectionRequirements: "x",
  mainTechnicalRequirements: "",
  implementationLocation: "x",
  serviceProcurementPeriod: "2026-03-30 ~ 2026-04-01",
  remark: "",
  contractSubject: "山东公司",
  applicant: "张三",
  contactInfo: "13800000000",
  lotDivisionReason: "x",
  attachments: [
    { id: "a1", name: "basis.pdf", size: 1, group: "采购依据", subtype: "立项文件", uploadedAt: now },
    { id: "a2", name: "scheme.pdf", size: 1, group: "技术方案及批复", subtype: "待定", uploadedAt: now },
    { id: "a3", name: "demand.pdf", size: 1, group: "采购需求", subtype: "招标需求表", uploadedAt: now },
    { id: "a4", name: "qual.pdf", size: 1, group: "资格材料", uploadedAt: now },
    { id: "a5", name: "audit.pdf", size: 1, group: "审计报告", uploadedAt: now },
  ],
}

const cases = [
  {
    name: "直接采购 - 缺少单一来源理由",
    form: { ...baseForm, procurementMethod: "直接采购", publicVendorSelection: false, singleSourceReason: "" },
  },
  {
    name: "直接采购 - 填全",
    form: { ...baseForm, procurementMethod: "直接采购", publicVendorSelection: false, singleSourceReason: "(五)响应人有且仅有1家" },
  },
  {
    name: "询比采购 - 公开选商未选",
    form: { ...baseForm, procurementMethod: "询比采购", publicVendorSelection: null },
  },
  {
    name: "询比采购 - 公开选商=是",
    form: { ...baseForm, procurementMethod: "询比采购", publicVendorSelection: true },
  },
  {
    name: "邀请招标 - 公开选商不为否",
    form: { ...baseForm, procurementMethod: "邀请招标", publicVendorSelection: true },
  },
]

for (const c of cases) {
  // eslint-disable-next-line no-await-in-loop
  const r = await createAndSubmit(c.form)
  console.log(c.name)
  console.log("  status:", r.status)
  console.log("  success:", r.body?.success)
  console.log("  error:", r.body?.error)
  console.log("  missing:", r.body?.data?.missing)
}


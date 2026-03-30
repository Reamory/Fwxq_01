import Divider from "@/components/ui/Divider"
import type { ServiceRequestRecord } from "../../../shared/serviceRequest"

const toBool = (v: boolean | null) => (v === null ? "—" : v ? "是" : "否")

export default function RequestDocumentTab({ req }: { req: ServiceRequestRecord }) {
  const attachments = req.attachments.slice().sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
  const groups = Array.from(new Set(attachments.map((a) => a.group)))
  const showNonPublic = req.publicVendorSelection === false
  const showControlPrice = req.hasControlPrice === true

  return (
    <div className="p-5">
      <Section title="基本信息">
        <Grid>
          <Field label="项目名称" value={req.projectName} span={2} />
          <Field label="需求时间" value={req.needDate} />
          <Field label="资金渠道" value={req.fundingChannel || "—"} />
          <Field label="申请单位" value={req.applicantCompany} />
          <Field label="申请部门" value={req.applicantDepartment} />
          <Field label="采购方式" value={req.procurementMethod || "—"} />
          <Field label="项目类型" value={req.projectType || "—"} />
          <Field label="公开选商" value={toBool(req.publicVendorSelection)} />
          <Field label="是否设控制价" value={toBool(req.hasControlPrice)} />
          <Field label="控制价（不含税，万元）" value={showControlPrice ? req.controlPriceWoTax || "—" : "—"} />
        </Grid>
      </Section>

      {showNonPublic ? (
        <>
          <Divider className="my-5" />
          <Section title="非公开选商信息">
            <Grid>
              <Field label="供应商邀请理由及产生方式" value={req.vendorInviteReason || "—"} span={2} />
              <Field label="拟邀请参加选商的供应商" value={req.invitedVendors.length ? req.invitedVendors.join("、") : "—"} span={2} />
              <Field label="预算项目(CBS)" value={req.budgetProjectCBS || "—"} span={2} />
            </Grid>
          </Section>
        </>
      ) : null}

      <Divider className="my-5" />
      <Section title="采购需求信息">
        <Grid>
          <Field label="项目概况" value={req.projectOverview || "—"} span={2} />
          <Field label="选商范围" value={req.vendorSelectionScope || "—"} span={2} />
          <Field label="选商要求" value={req.vendorSelectionRequirements || "—"} span={2} />
          <Field label="主要技术要求" value={req.mainTechnicalRequirements || "—"} span={2} />
          <Field label="实施地点" value={req.implementationLocation || "—"} />
          <Field label="服务（采购）期限" value={req.serviceProcurementPeriod || "—"} />
          <Field label="备注" value={req.remark || "—"} span={2} />
          <Field label="标段（标包）划分及标段划分理由" value={req.lotDivisionReason || "—"} span={2} />
        </Grid>
      </Section>

      <Divider className="my-5" />
      <Section title="联系人信息">
        <Grid>
          <Field label="签约主体" value={req.contractSubject || "—"} />
          <Field label="申请人" value={req.applicant || "—"} />
          <Field label="联系方式" value={req.contactInfo || "—"} />
        </Grid>
      </Section>

      <Divider className="my-5" />
      <Section title="附件">
        {attachments.length === 0 ? (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">暂无附件</div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g}>
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{g}</div>
                <div className="mt-2 space-y-2">
                  {attachments
                    .filter((a) => a.group === g)
                    .map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-900 dark:bg-zinc-950"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{a.name}</div>
                          <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {a.subtype ? a.subtype : "—"} · {a.uploadedAt}
                          </div>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{Math.max(1, Math.round(a.size / 1024))} KB</div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
}

function Field({
  label,
  value,
  span,
}: {
  label: string
  value: string
  span?: 1 | 2
}) {
  return (
    <div
      className={
        "rounded-xl border border-zinc-200/70 bg-white/60 p-3 dark:border-zinc-900/70 dark:bg-zinc-950/40 " +
        (span === 2 ? "md:col-span-2" : "")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
        <div className="min-w-0 flex-1 whitespace-pre-wrap text-right text-sm font-medium text-zinc-900 dark:text-zinc-50">{value || "—"}</div>
      </div>
    </div>
  )
}

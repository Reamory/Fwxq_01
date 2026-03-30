import type { ProcurementMethod, ProjectType, RequestStatus } from "../../../shared/serviceRequest"

export type RequestsListView = "todo" | "handled" | "initiated" | "manage"

export type RequestsListFilters = {
  q: string
  status: RequestStatus | ""
  company: string
  department: string
  projectType: ProjectType | ""
  procurementMethod: ProcurementMethod | ""
  needDateFrom: string
  needDateTo: string
}


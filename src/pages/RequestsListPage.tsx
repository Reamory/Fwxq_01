import RequestsListPageImpl from "@/pages/requests-list/RequestsListPageImpl"
import type { RequestsListView } from "@/pages/requests-list/types"

export default function RequestsListPage({ view }: { view: RequestsListView }) {
  return <RequestsListPageImpl view={view} />
}


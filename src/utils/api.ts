import type { SessionUser } from "../../shared/serviceRequest"

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; data?: unknown }

type ApiOptions = {
  user?: SessionUser
}

const buildQuery = (params: Record<string, string | undefined>) => {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (!v) return
    usp.set(k, v)
  })
  const s = usp.toString()
  return s ? `?${s}` : ""
}

export const api = {
  async get<T>(path: string, params?: Record<string, string | undefined>, opts?: ApiOptions): Promise<ApiResult<T>> {
    const res = await fetch(`${path}${params ? buildQuery(params) : ""}`, {
      headers: opts?.user?.id ? { "x-user-id": opts.user.id } : undefined,
    })
    return (await res.json()) as ApiResult<T>
  },
  async post<T>(path: string, body?: unknown, opts?: ApiOptions): Promise<ApiResult<T>> {
    const headers: Record<string, string> = { "content-type": "application/json" }
    if (opts?.user?.id) headers["x-user-id"] = opts.user.id
    const res = await fetch(path, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : "{}",
    })
    return (await res.json()) as ApiResult<T>
  },
  async put<T>(path: string, body?: unknown, opts?: ApiOptions): Promise<ApiResult<T>> {
    const headers: Record<string, string> = { "content-type": "application/json" }
    if (opts?.user?.id) headers["x-user-id"] = opts.user.id
    const res = await fetch(path, {
      method: "PUT",
      headers,
      body: body ? JSON.stringify(body) : "{}",
    })
    return (await res.json()) as ApiResult<T>
  },
}

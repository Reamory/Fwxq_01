import type { VercelRequest, VercelResponse } from "@vercel/node"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const mod = await import("./app.js")
    const app = mod.default as unknown as (req: VercelRequest, res: VercelResponse) => unknown
    return app(req, res)
  } catch (e) {
    const message = e instanceof Error ? e.message : "UnknownError"
    res.statusCode = 500
    res.setHeader("content-type", "application/json; charset=utf-8")
    res.end(JSON.stringify({ success: false, error: "FunctionCrash", data: { message } }))
  }
}

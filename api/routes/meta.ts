import express, { type Request, type Response } from "express"

const router = express.Router()

router.get("/companies", (req: Request, res: Response) => {
  void req
  res.json({ success: true, data: ["山东公司", "广西公司"] })
})

router.get("/departments", (req: Request, res: Response) => {
  const company = String(req.query.company || "")
  const map: Record<string, string[]> = {
    山东公司: ["潍坊作业区", "济南作业区"],
    广西公司: ["xx作业区"],
  }
  res.json({ success: true, data: map[company] || [] })
})

router.get("/options", (req: Request, res: Response) => {
  void req
  res.json({
    success: true,
    data: {
      fundingChannels: ["投资", "成本", "成本+投资"],
      procurementMethods: ["直接采购", "询比采购", "竞价采购", "谈判采购", "公开招标", "邀请招标"],
      projectTypes: ["工程类", "工程服务类", "其他服务"],
      vendors: ["华北供应商A", "华东供应商B", "优选承包商C"],
    },
  })
})

export default router


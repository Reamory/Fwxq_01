# 稳定版本记录（Stable Baseline）

## 基线信息

- Git Tag: stable-20260331
- Commit: 865818db092cd3444cf584ff7e9652fa5391f0ac
- 生产环境: https://fwxq-01.vercel.app/

## 生产环境验证

- /api/health：ok
- /api/health/db：db ok

## 本次稳定版本包含的关键变更

- 采购方式联动规则（表单显隐/默认/必填/禁用）已落地
  - 询比采购 / 竞价采购 / 谈判采购 / 公开招标：公开选商显示且必填（可编辑）
  - 直接采购：公开选商显示，默认“否”，不可编辑
  - 邀请招标：公开选商显示，默认“否”，不可编辑
- 新增字段：单一来源选商理由（singleSourceReason）
  - 仅在“直接采购”且进入“非公开选商信息”区域时显示为下拉（必填）

## 数据库迁移

- 已新增迁移文件：supabase/migrations/0002_add_single_source_reason.sql
  - 新增列：public.service_requests.single_source_reason（text，默认空串）

## 生产兼容兜底

- 若生产环境尚未执行 0002 迁移导致缺少列 single_source_reason
  - 后端写入会自动忽略该列并重试，避免新建/保存接口直接失败
  - 迁移完成后该字段即可正常落库


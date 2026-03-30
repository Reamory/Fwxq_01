import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import { useSessionStore } from "@/store/session"

export default function SettingsPage() {
  const user = useSessionStore((s) => s.user)

  if (user.role !== "manager") {
    return (
      <div className="mx-auto w-full">
        <Card className="p-5">
          <div className="text-lg font-semibold">无权限</div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">仅管理员可访问平台设置。</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full">
      <div className="text-2xl font-semibold tracking-tight">设置</div>
      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">平台常用功能配置（当前为 mock）</div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm font-semibold">组织字典</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">公司 / 作业区选项（示例）</div>
          <div className="mt-4 space-y-2">
            <Input value="山东公司, 广西公司" readOnly />
            <Input value="山东公司：潍坊作业区, 济南作业区" readOnly />
            <Input value="广西公司：xx作业区" readOnly />
          </div>
          <div className="mt-4">
            <Button variant="secondary" disabled>
              保存（待接入）
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold">平台开关</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">常用功能入口（示例）</div>
          <div className="mt-4 space-y-2">
            <Input value="站内信：开启" readOnly />
            <Input value="全局搜索：关闭" readOnly />
          </div>
          <div className="mt-4">
            <Button variant="secondary" disabled>
              应用（待接入）
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}


import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Bell, FileText, GitBranch, Inbox, LayoutList, ListTodo, Moon, PanelLeft, Plus, Send, Settings, Sun, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import Button from "@/components/ui/Button"
import { useTheme } from "@/hooks/useTheme"
import { useSessionStore } from "@/store/session"
import { api } from "@/utils/api"

const nav = [
  { to: "/todo", label: "我的待办", icon: ListTodo },
  { to: "/handled", label: "我处理的", icon: Inbox },
  { to: "/initiated", label: "我发起的", icon: Send },
  { to: "/manage", label: "服务需求管理", icon: LayoutList },
] as const

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isDark, toggleTheme } = useTheme()
  const user = useSessionStore((s) => s.user)
  const allUsers = useSessionStore((s) => s.allUsers)
  const setUserById = useSessionStore((s) => s.setUserById)
  const location = useLocation()
  const [navCounts, setNavCounts] = useState<{ todo: number; handled: number; initiated: number } | null>(null)
  const [hasRightAside, setHasRightAside] = useState(false)

  const [sidebarMode, setSidebarMode] = useState<"full" | "icon">(() => {
    try {
      const raw = localStorage.getItem("sr_sidebar_mode")
      return raw === "icon" ? "icon" : "full"
    } catch {
      return "full"
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem("sr_sidebar_mode", sidebarMode)
    } catch {
      void 0
    }
  }, [sidebarMode])

  const isIconSidebar = sidebarMode === "icon"

  const moduleName = useMemo(() => "服务需求管理", [])

  useEffect(() => {
    let canceled = false
    const run = async () => {
      const [todo, handled, initiated] = await Promise.all([
        api.get<{ items: unknown[]; total: number }>("/api/requests", { view: "todo", page: "1", pageSize: "1" }, { user }),
        api.get<{ items: unknown[]; total: number }>("/api/requests", { view: "handled", page: "1", pageSize: "1" }, { user }),
        api.get<{ items: unknown[]; total: number }>("/api/requests", { view: "initiated", page: "1", pageSize: "1" }, { user }),
      ])

      if (canceled) return
      if (todo.success === false || handled.success === false || initiated.success === false) {
        setNavCounts(null)
        return
      }

      setNavCounts({ todo: todo.data.total, handled: handled.data.total, initiated: initiated.data.total })
    }

    run()
    return () => {
      canceled = true
    }
  }, [user])

  useEffect(() => {
    if (typeof document === "undefined") return
    const el = document.getElementById("app_right_aside")
    if (!el) return
    const update = () => setHasRightAside(el.childElementCount > 0)
    update()
    if (typeof MutationObserver === "undefined") return
    const obs = new MutationObserver(update)
    obs.observe(el, { childList: true })
    return () => obs.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/70 backdrop-blur dark:border-zinc-900 dark:bg-zinc-950/60">
        <div className="mx-auto flex h-16 w-full items-center gap-3 px-4">
          <Link to="/todo" className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900">
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 shadow-sm">
              <FileText className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-white" aria-hidden="true" />
              <GitBranch className="absolute -bottom-1 -right-1 h-4 w-4 rounded-lg bg-white/20 p-0.5 text-white ring-1 ring-white/25" aria-hidden="true" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <div className="truncate text-sm font-semibold">{moduleName}</div>
            </div>
          </Link>

          <Button
            variant="ghost"
            className="h-10 w-10 p-0"
            aria-label={isIconSidebar ? "展开侧边栏" : "折叠侧边栏"}
            onClick={() => setSidebarMode((s) => (s === "icon" ? "full" : "icon"))}
          >
            <PanelLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <Link to="/requests/new" className="sm:hidden">
            <Button variant="primary" className="h-10 w-10 p-0" aria-label="新建需求">
              <Plus className="h-5 w-5" />
            </Button>
          </Link>

          <Link to="/inbox">
            <Button variant="ghost" className="h-10 w-10 p-0" aria-label="通知">
              <Bell className="h-5 w-5" />
            </Button>
          </Link>

          <Button variant="ghost" className="h-10 w-10 p-0" aria-label="切换主题" onClick={toggleTheme}>
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <div id="app_header_right" className="flex min-w-0 items-center gap-2" />

          <div className="hidden items-center gap-2 sm:flex">
            <UserRound className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            <select
              className={cn(
                "h-9 rounded-lg border border-zinc-200/70 bg-white/60 px-2 text-xs text-zinc-700",
                "dark:border-zinc-800/70 dark:bg-zinc-950/40 dark:text-zinc-200",
              )}
              value={user.id}
              onChange={(e) => setUserById(e.target.value)}
              aria-label="切换用户"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="mx-auto flex h-[calc(100vh-4rem)] w-full overflow-hidden">
        <aside
          className={cn(
            "hidden h-full shrink-0 overflow-y-auto border-r border-zinc-200 bg-white/70 p-4 backdrop-blur dark:border-zinc-900 dark:bg-zinc-950/60 lg:block",
            isIconSidebar ? "w-[72px] px-3" : "w-[280px]",
          )}
        >
          <div className="mt-0">
            <Link to="/requests/new" className="block">
              <Button variant="primary" className={cn(isIconSidebar ? "h-10 w-10 p-0" : "w-full")} aria-label="新建需求">
                <Plus className="h-4 w-4" />
                {isIconSidebar ? null : "新建需求"}
              </Button>
            </Link>
          </div>

          <nav className="mt-4 space-y-1">
            {nav.map((n) => {
              const active = location.pathname === n.to
              const Icon = n.icon
              const count =
                n.to === "/todo"
                  ? navCounts?.todo
                  : n.to === "/handled"
                    ? navCounts?.handled
                    : n.to === "/initiated"
                      ? navCounts?.initiated
                      : undefined
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  title={n.label}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900",
                    isIconSidebar ? "relative justify-center px-2" : "",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {isIconSidebar ? (
                    typeof count === "number" && count > 0 ? (
                      <span
                        className={
                          "absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums " +
                          (active
                            ? "bg-white/20 text-white dark:bg-zinc-900 dark:text-zinc-50"
                            : "bg-zinc-100/90 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200")
                        }
                      >
                        {count}
                      </span>
                    ) : null
                  ) : (
                    <>
                      {n.label}
                      {typeof count === "number" ? (
                        <span
                          className={
                            "ml-auto rounded-full px-2 py-0.5 text-xs tabular-nums " +
                            (active
                              ? "bg-white/15 text-white dark:bg-zinc-900 dark:text-zinc-50"
                              : "bg-zinc-100/80 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200")
                          }
                        >
                          {count}
                        </span>
                      ) : null}
                    </>
                  )}
                </Link>
              )
            })}
          </nav>

          {user.role === "manager" ? (
            <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-900">
              <Link
                to="/settings"
                title="设置"
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                  location.pathname === "/settings"
                    ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900",
                  isIconSidebar ? "justify-center px-2" : "",
                )}
              >
                <Settings className="h-4 w-4" />
                {isIconSidebar ? null : "设置"}
              </Link>
            </div>
          ) : null}

        </aside>

        <div className="flex min-w-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto p-4">{children}</main>
          <aside
            className={cn(
              "hidden h-full shrink-0 border-l border-zinc-200 bg-white/40 backdrop-blur dark:border-zinc-900 dark:bg-zinc-950/30 lg:block",
              hasRightAside ? "w-[360px]" : "w-0 border-l-0",
            )}
          >
            <div className={cn("h-full", hasRightAside ? "overflow-y-auto p-4" : "p-0")}>
              <div id="app_right_aside" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

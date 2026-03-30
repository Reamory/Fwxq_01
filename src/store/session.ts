import { create } from "zustand"
import type { SessionUser, UserRole } from "../../shared/serviceRequest"

const users: SessionUser[] = [
  {
    id: "u_business",
    name: "业务方-张三",
    role: "business",
    company: "山东公司",
    department: "潍坊作业区",
  },
  {
    id: "u_approver",
    name: "审批人-李四",
    role: "approver",
    company: "山东公司",
    department: "采购管理部",
  },
  {
    id: "u_manager",
    name: "管理员-王五",
    role: "manager",
    company: "山东公司",
    department: "信息管理部",
  },
]

type SessionState = {
  user: SessionUser
  setUserByRole: (role: UserRole) => void
  setUserById: (id: string) => void
  allUsers: SessionUser[]
}

export const useSessionStore = create<SessionState>((set) => ({
  user: users[0],
  allUsers: users,
  setUserByRole: (role) => set((s) => ({ user: users.find((u) => u.role === role) ?? s.user })),
  setUserById: (id) => set((s) => ({ user: users.find((u) => u.id === id) ?? s.user })),
}))


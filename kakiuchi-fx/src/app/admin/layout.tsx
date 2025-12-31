import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AdminWrapper } from "@/components/layout/admin-wrapper"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session) {
        redirect("/admin-login")
    }

    // 管理者権限チェック
    if (session.user.role !== "ADMIN") {
        redirect("/dashboard")
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <AdminWrapper>
                {children}
            </AdminWrapper>
        </div>
    )
}

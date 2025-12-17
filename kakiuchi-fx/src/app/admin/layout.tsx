import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AdminSidebar } from "@/components/layout/admin-sidebar"

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
            <AdminSidebar />
            <main className="ml-64 min-h-screen">
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    )
}

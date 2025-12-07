import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/layout/sidebar"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <Sidebar />
            <main className="ml-64 min-h-screen">
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    )
}

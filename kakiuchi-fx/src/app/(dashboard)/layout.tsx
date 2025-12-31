import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { DashboardWrapper } from "@/components/layout/dashboard-wrapper"

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
            <DashboardWrapper>
                {children}
            </DashboardWrapper>
        </div>
    )
}

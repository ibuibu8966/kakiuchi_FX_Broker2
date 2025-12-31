"use client"

import { AdminDataProvider } from "@/contexts/admin-data-context"
import { AdminSidebar } from "@/components/layout/admin-sidebar"

export function AdminWrapper({ children }: { children: React.ReactNode }) {
    return (
        <AdminDataProvider>
            <AdminSidebar />
            <main className="ml-64 min-h-screen">
                <div className="p-6">
                    {children}
                </div>
            </main>
        </AdminDataProvider>
    )
}

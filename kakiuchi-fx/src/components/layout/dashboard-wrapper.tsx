"use client"

import { CustomerDataProvider } from "@/contexts/customer-data-context"
import { Sidebar } from "@/components/layout/sidebar"

export function DashboardWrapper({ children }: { children: React.ReactNode }) {
    return (
        <CustomerDataProvider>
            <Sidebar />
            <main className="ml-64 min-h-screen">
                <div className="p-6">
                    {children}
                </div>
            </main>
        </CustomerDataProvider>
    )
}

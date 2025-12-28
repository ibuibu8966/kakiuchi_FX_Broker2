"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

const navigation = [
    { name: "ダッシュボード", href: "/admin", icon: HomeIcon },
    { name: "ユーザー管理", href: "/admin/users", icon: UsersIcon },
    { name: "入出金管理", href: "/admin/transactions", icon: TransactionIcon },
    { name: "ポジション監視", href: "/admin/positions", icon: PositionIcon },
    { name: "注文履歴", href: "/admin/orders", icon: OrderIcon },
    { name: "チャット管理", href: "/admin/chat", icon: ChatIcon },
    { name: "システム設定", href: "/admin/settings", icon: SettingsIcon },
]

function HomeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    )
}

function UsersIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    )
}

function TransactionIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
    )
}

function PositionIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    )
}

function OrderIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
    )
}

function ChatIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
    )
}

function SettingsIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    )
}

export function AdminSidebar() {
    const pathname = usePathname()
    const { user } = useAuth()

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800">
            <div className="flex h-full flex-col">
                {/* Logo */}
                <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-800">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-lg font-bold">A</span>
                    </div>
                    <div>
                        <span className="text-white text-lg font-bold">Admin</span>
                        <p className="text-xs text-slate-500">Kakiuchi FX</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    <ul className="space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== "/admin" && pathname.startsWith(item.href))
                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                            isActive
                                                ? "bg-gradient-to-r from-red-600/20 to-orange-600/20 text-white border border-red-500/30"
                                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        {item.name}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                {/* User section */}
                <div className="border-t border-slate-800 p-4">
                    <div className="mb-3 px-3">
                        <p className="text-sm font-medium text-white truncate">
                            {user?.name || "管理者"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                            {user?.email}
                        </p>
                    </div>
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all mb-2"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        顧客画面へ
                    </Link>
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        ログアウト
                    </button>
                </div>
            </div>
        </aside>
    )
}

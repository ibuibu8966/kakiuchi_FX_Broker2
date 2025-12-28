import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatAmount } from "@/lib/utils/bigint"
import Link from "next/link"

export default async function AdminDashboardPage() {
    // 統計データを取得
    const [
        totalUsers,
        pendingTransactions,
        openPositions,
        openChats,
        totalBalance,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.transaction.count({ where: { status: "PENDING" } }),
        prisma.position.count({ where: { status: "OPEN" } }),
        prisma.chatRoom.count({ where: { status: "OPEN" } }),
        prisma.account.aggregate({ _sum: { balance: true } }),
    ])

    const stats = [
        {
            name: "総ユーザー数",
            value: totalUsers,
            href: "/admin/users",
            color: "blue",
        },
        {
            name: "入出金申請待ち",
            value: pendingTransactions,
            href: "/admin/transactions",
            color: "orange",
            alert: pendingTransactions > 0,
        },
        {
            name: "オープンポジション",
            value: openPositions,
            href: "/admin/positions",
            color: "green",
        },
        {
            name: "未対応チャット",
            value: openChats,
            href: "/admin/chat",
            color: "purple",
            alert: openChats > 0,
        },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">管理者ダッシュボード</h1>
                <p className="text-slate-400 mt-1">システム全体の概要</p>
            </div>

            {/* 統計カード */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Link key={stat.name} href={stat.href}>
                        <Card className={`bg-slate-900/50 border-slate-800 hover:border-${stat.color}-500/50 transition-colors cursor-pointer relative`}>
                            {stat.alert && (
                                <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            )}
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400">{stat.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className={`text-3xl font-bold text-${stat.color}-400`}>{stat.value}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* 総預かり資産 */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white">総預かり資産</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold text-white">
                        {formatAmount(totalBalance._sum.balance || 0n)}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">全顧客の残高合計</p>
                </CardContent>
            </Card>

            {/* クイックリンク */}
            <div className="grid gap-4 md:grid-cols-2">
                <Link href="/admin/transactions">
                    <Card className="bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20 transition-colors cursor-pointer">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-white">入出金管理</p>
                                <p className="text-sm text-orange-400">{pendingTransactions}件の承認待ち</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/chat">
                    <Card className="bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 transition-colors cursor-pointer">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-white">チャット対応</p>
                                <p className="text-sm text-purple-400">{openChats}件の未対応</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}

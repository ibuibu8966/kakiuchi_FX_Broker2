import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { translateStatus, getStatusColor } from "@/lib/utils"
import { formatAmount } from "@/lib/utils/bigint"
import Link from "next/link"

export default async function DashboardPage() {
    const session = await auth()

    // 口座情報を取得
    const account = await prisma.account.findFirst({
        where: { userId: session?.user?.id },
        include: {
            positions: {
                where: { status: "OPEN" },
                take: 5,
            },
            trades: {
                orderBy: { executedAt: "desc" },
                take: 5,
            },
        },
    })

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
        where: { id: session?.user?.id },
    })

    const balance = account?.balance ?? 0n
    const equity = account?.equity ?? 0n
    const usedMargin = account?.usedMargin ?? 0n
    const freeMargin = equity - usedMargin
    const marginLevel = usedMargin > 0n
        ? (Number(equity) / Number(usedMargin)) * 100
        : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">ダッシュボード</h1>
                    <p className="text-slate-400 mt-1">ようこそ、{session?.user?.name}さん</p>
                </div>

                {/* KYC警告 */}
                {user?.kycStatus !== "VERIFIED" && (
                    <Link
                        href="/kyc"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm hover:bg-yellow-500/20 transition"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>本人確認が必要です</span>
                    </Link>
                )}
            </div>

            {/* 口座サマリー */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">残高</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">{formatAmount(balance, false)}</p>
                        <p className="text-xs text-slate-500">JPY</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">有効証拠金</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">{formatAmount(equity, false)}</p>
                        <p className="text-xs text-slate-500">JPY</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">余剰証拠金</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-green-400">{formatAmount(freeMargin, false)}</p>
                        <p className="text-xs text-slate-500">JPY</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">証拠金維持率</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-2xl font-bold ${marginLevel < 50 ? 'text-red-400' : marginLevel < 100 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {usedMargin > 0n ? `${marginLevel.toFixed(1)}%` : '---'}
                        </p>
                        <p className="text-xs text-slate-500">ロスカット水準: 20%</p>
                    </CardContent>
                </Card>
            </div>

            {/* アクティブポジション & 最近の取引 */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* ポジション */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg text-white">アクティブポジション</CardTitle>
                        <Link href="/positions" className="text-sm text-blue-400 hover:text-blue-300">
                            すべて見る →
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {account?.positions && account.positions.length > 0 ? (
                            <div className="space-y-3">
                                {account.positions.map((position) => (
                                    <div
                                        key={position.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${position.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {translateStatus(position.side)}
                                            </span>
                                            <span className="text-white font-medium">{position.symbol}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-medium">
                                                {Number(position.quantity) / 1000} ロット
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                @ {Number(position.entryPrice) / 10000}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-8">
                                保有ポジションはありません
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* 最近の取引 */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg text-white">最近の取引</CardTitle>
                        <Link href="/history" className="text-sm text-blue-400 hover:text-blue-300">
                            すべて見る →
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {account?.trades && account.trades.length > 0 ? (
                            <div className="space-y-3">
                                {account.trades.map((trade) => (
                                    <div
                                        key={trade.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${trade.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {translateStatus(trade.side)}
                                            </span>
                                            <div>
                                                <p className="text-white font-medium">{trade.symbol}</p>
                                                <p className="text-xs text-slate-400">
                                                    {new Date(trade.executedAt).toLocaleString('ja-JP')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-medium">
                                                @ {Number(trade.price) / 10000}
                                            </p>
                                            {trade.pnl !== null && (
                                                <p className={`text-xs ${Number(trade.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {formatAmount(trade.pnl)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-8">
                                取引履歴はありません
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 口座情報 */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-white">口座情報</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <dt className="text-sm text-slate-400">口座番号</dt>
                            <dd className="text-lg font-mono text-white">{account?.accountNumber || "---"}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-slate-400">レバレッジ</dt>
                            <dd className="text-lg font-bold text-white">{account?.leverage || 100}倍</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-slate-400">口座ステータス</dt>
                            <dd>
                                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(account?.status || 'ACTIVE')}`}>
                                    {translateStatus(account?.status || 'ACTIVE')}
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-slate-400">KYCステータス</dt>
                            <dd>
                                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(user?.kycStatus || 'PENDING')}`}>
                                    {translateStatus(user?.kycStatus || 'PENDING')}
                                </span>
                            </dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>
        </div>
    )
}

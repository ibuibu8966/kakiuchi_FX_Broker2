"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface UserDetail {
    user: {
        id: string
        email: string
        name: string
        phone: string | null
        role: string
        isActive: boolean
        createdAt: string
        lastLoginAt: string | null
    }
    account: {
        id: string
        accountNumber: string
        balance: number
        equity: number
        leverage: number
        status: string
    } | null
    transactions: Array<{
        id: string
        type: string
        amount: number
        status: string
        createdAt: string
        processedAt: string | null
        note: string | null
    }>
    trades: Array<{
        id: string
        symbol: string
        side: string
        tradeType: string
        quantity: number
        price: number
        pnl: number | null
        executedAt: string
    }>
    positions: Array<{
        id: string
        symbol: string
        side: string
        quantity: number
        entryPrice: number
        status: string
        realizedPnl: number | null
        openedAt: string
        closedAt: string | null
    }>
    chatRooms: Array<{
        id: string
        subject: string | null
        status: string
        updatedAt: string
        lastMessage: string | null
    }>
}

type TabType = "transactions" | "trades" | "positions" | "chat"

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData] = useState<UserDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabType>("transactions")

    useEffect(() => {
        fetchUserDetail()
    }, [id])

    const fetchUserDetail = async () => {
        try {
            const res = await fetch(`/api/admin/users/${id}`)
            if (res.ok) {
                const result = await res.json()
                setData(result)
            } else {
                router.push("/admin/users")
            }
        } catch {
            router.push("/admin/users")
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            PENDING: "bg-yellow-500/20 text-yellow-400",
            APPROVED: "bg-blue-500/20 text-blue-400",
            COMPLETED: "bg-green-500/20 text-green-400",
            REJECTED: "bg-red-500/20 text-red-400",
            OPEN: "bg-blue-500/20 text-blue-400",
            CLOSED: "bg-gray-500/20 text-gray-400",
            RESOLVED: "bg-green-500/20 text-green-400",
        }
        return colors[status] || "bg-gray-500/20 text-gray-400"
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    if (!data) {
        return <div className="text-white">ユーザーが見つかりません</div>
    }

    return (
        <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/admin/users")}
                            className="text-slate-400 hover:text-white"
                        >
                            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            戻る
                        </Button>
                        <h1 className="text-3xl font-bold text-white">{data.user.name}</h1>
                        <span className={`px-2 py-1 rounded text-xs ${data.user.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                            {data.user.isActive ? "アクティブ" : "停止中"}
                        </span>
                    </div>
                    <p className="text-slate-400 mt-1">{data.user.email}</p>
                </div>
            </div>

            {/* 基本情報カード */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-400">口座番号</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-bold text-white">{data.account?.accountNumber || "---"}</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-400">残高</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-bold text-green-400">
                            ${data.account?.balance.toFixed(2) || "0.00"}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-400">レバレッジ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-bold text-white">{data.account?.leverage || 0}x</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-400">登録日</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg font-bold text-white">{formatDate(data.user.createdAt).split(" ")[0]}</p>
                    </CardContent>
                </Card>
            </div>

            {/* タブ */}
            <div className="border-b border-slate-800">
                <div className="flex gap-4">
                    {[
                        { key: "transactions", label: "入出金履歴", count: data.transactions.length },
                        { key: "trades", label: "取引履歴", count: data.trades.length },
                        { key: "positions", label: "ポジション", count: data.positions.length },
                        { key: "chat", label: "チャット", count: data.chatRooms.length },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as TabType)}
                            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.key
                                    ? "border-blue-500 text-white"
                                    : "border-transparent text-slate-400 hover:text-white"
                                }`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>
            </div>

            {/* コンテンツ */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-0">
                    {activeTab === "transactions" && (
                        <div className="overflow-x-auto">
                            {data.transactions.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">入出金履歴がありません</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-slate-400">
                                            <th className="text-left py-3 px-4">日時</th>
                                            <th className="text-left py-3 px-4">種別</th>
                                            <th className="text-right py-3 px-4">金額</th>
                                            <th className="text-left py-3 px-4">ステータス</th>
                                            <th className="text-left py-3 px-4">備考</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.transactions.map((tx) => (
                                            <tr key={tx.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                                <td className="py-3 px-4 text-slate-300">{formatDate(tx.createdAt)}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded text-xs ${tx.type === "DEPOSIT" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                                        {tx.type === "DEPOSIT" ? "入金" : "出金"}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right text-white font-mono">${tx.amount.toFixed(2)}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(tx.status)}`}>
                                                        {tx.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-400 truncate max-w-[200px]">{tx.note || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeTab === "trades" && (
                        <div className="overflow-x-auto">
                            {data.trades.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">取引履歴がありません</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-slate-400">
                                            <th className="text-left py-3 px-4">日時</th>
                                            <th className="text-left py-3 px-4">シンボル</th>
                                            <th className="text-left py-3 px-4">方向</th>
                                            <th className="text-left py-3 px-4">種別</th>
                                            <th className="text-right py-3 px-4">ロット</th>
                                            <th className="text-right py-3 px-4">価格</th>
                                            <th className="text-right py-3 px-4">損益</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.trades.map((trade) => (
                                            <tr key={trade.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                                <td className="py-3 px-4 text-slate-300">{formatDate(trade.executedAt)}</td>
                                                <td className="py-3 px-4 text-white">{trade.symbol}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded text-xs ${trade.side === "BUY" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                                        {trade.side}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-400">{trade.tradeType}</td>
                                                <td className="py-3 px-4 text-right text-white font-mono">{trade.quantity.toFixed(2)}</td>
                                                <td className="py-3 px-4 text-right text-white font-mono">{trade.price.toFixed(3)}</td>
                                                <td className={`py-3 px-4 text-right font-mono ${trade.pnl === null ? "text-slate-400" : trade.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                    {trade.pnl !== null ? `$${trade.pnl.toFixed(2)}` : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeTab === "positions" && (
                        <div className="overflow-x-auto">
                            {data.positions.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">ポジション履歴がありません</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-slate-400">
                                            <th className="text-left py-3 px-4">建て日時</th>
                                            <th className="text-left py-3 px-4">シンボル</th>
                                            <th className="text-left py-3 px-4">方向</th>
                                            <th className="text-right py-3 px-4">ロット</th>
                                            <th className="text-right py-3 px-4">エントリー</th>
                                            <th className="text-left py-3 px-4">ステータス</th>
                                            <th className="text-right py-3 px-4">確定損益</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.positions.map((pos) => (
                                            <tr key={pos.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                                <td className="py-3 px-4 text-slate-300">{formatDate(pos.openedAt)}</td>
                                                <td className="py-3 px-4 text-white">{pos.symbol}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded text-xs ${pos.side === "BUY" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                                        {pos.side}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right text-white font-mono">{pos.quantity.toFixed(2)}</td>
                                                <td className="py-3 px-4 text-right text-white font-mono">{pos.entryPrice.toFixed(3)}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(pos.status)}`}>
                                                        {pos.status}
                                                    </span>
                                                </td>
                                                <td className={`py-3 px-4 text-right font-mono ${pos.realizedPnl === null ? "text-slate-400" : pos.realizedPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                    {pos.realizedPnl !== null ? `$${pos.realizedPnl.toFixed(2)}` : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeTab === "chat" && (
                        <div>
                            {data.chatRooms.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">チャット履歴がありません</div>
                            ) : (
                                <div className="divide-y divide-slate-800">
                                    {data.chatRooms.map((room) => (
                                        <Link
                                            key={room.id}
                                            href={`/admin/chat/${room.id}`}
                                            className="block p-4 hover:bg-slate-800/30 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-white font-medium">{room.subject || "（件名なし）"}</p>
                                                    <p className="text-sm text-slate-400 truncate max-w-md">{room.lastMessage || "メッセージなし"}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(room.status)}`}>
                                                        {room.status}
                                                    </span>
                                                    <span className="text-xs text-slate-500">{formatDate(room.updatedAt)}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

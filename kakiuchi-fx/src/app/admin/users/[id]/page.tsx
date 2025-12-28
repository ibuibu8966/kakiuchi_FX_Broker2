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
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<TabType>("transactions")

    // モーダル状態
    const [showTransactionModal, setShowTransactionModal] = useState(false)
    const [showChatModal, setShowChatModal] = useState(false)
    const [modalLoading, setModalLoading] = useState(false)
    const [modalError, setModalError] = useState("")

    // 入出金フォーム
    const [txType, setTxType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT")
    const [txAmount, setTxAmount] = useState("")
    const [txNote, setTxNote] = useState("")

    // チャットフォーム
    const [chatSubject, setChatSubject] = useState("")
    const [chatMessage, setChatMessage] = useState("")

    useEffect(() => {
        fetchUserDetail()
    }, [id])

    const fetchUserDetail = async () => {
        try {
            const res = await fetch(`/api/admin/users/${id}`)
            const result = await res.json()
            if (res.ok) {
                setData(result)
            } else {
                const details = result.details ? ` (${result.details})` : ""
                setError((result.error || `エラー: ${res.status}`) + details)
            }
        } catch (err) {
            setError(`ネットワークエラー: ${err instanceof Error ? err.message : "不明"}`)
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

    // 入出金処理
    const handleCreateTransaction = async (e: React.FormEvent) => {
        e.preventDefault()
        setModalError("")
        setModalLoading(true)

        try {
            const res = await fetch("/api/admin/transactions/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: id,
                    type: txType,
                    amount: txAmount,
                    note: txNote,
                }),
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "エラーが発生しました")

            setShowTransactionModal(false)
            setTxAmount("")
            setTxNote("")
            fetchUserDetail() // データ再取得
        } catch (err) {
            setModalError(err instanceof Error ? err.message : "エラーが発生しました")
        } finally {
            setModalLoading(false)
        }
    }

    // チャット開始処理
    const handleCreateChat = async (e: React.FormEvent) => {
        e.preventDefault()
        setModalError("")
        setModalLoading(true)

        try {
            const res = await fetch("/api/admin/chat/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: id,
                    subject: chatSubject,
                    message: chatMessage,
                }),
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "エラーが発生しました")

            // チャットルームに遷移
            router.push(`/admin/chat/${result.chatRoom.id}`)
        } catch (err) {
            setModalError(err instanceof Error ? err.message : "エラーが発生しました")
        } finally {
            setModalLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="space-y-4">
                <div className="text-white">ユーザーが見つかりません</div>
                {error && <div className="text-red-400 text-sm">{error}</div>}
                <Button onClick={() => router.push("/admin/users")} variant="outline">
                    ユーザー一覧に戻る
                </Button>
            </div>
        )
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
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowTransactionModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium text-sm"
                    >
                        入出金
                    </button>
                    <button
                        onClick={() => setShowChatModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium text-sm"
                    >
                        チャット開始
                    </button>
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

            {/* 入出金モーダル */}
            {showTransactionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-xl font-bold text-white mb-4">入出金 - {data.user.name}</h2>
                        <form onSubmit={handleCreateTransaction} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">種別</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={txType === "DEPOSIT"}
                                            onChange={() => setTxType("DEPOSIT")}
                                            className="text-green-600"
                                        />
                                        <span className="text-green-400">入金</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={txType === "WITHDRAWAL"}
                                            onChange={() => setTxType("WITHDRAWAL")}
                                            className="text-orange-600"
                                        />
                                        <span className="text-orange-400">出金</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">金額 (USDT)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={txAmount}
                                    onChange={(e) => setTxAmount(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    placeholder="例: 1000.00"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">メモ（任意）</label>
                                <input
                                    type="text"
                                    value={txNote}
                                    onChange={(e) => setTxNote(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    placeholder="例: 初回ボーナス"
                                />
                            </div>
                            {modalError && (
                                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                                    {modalError}
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowTransactionModal(false); setModalError("") }}
                                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={modalLoading}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                                >
                                    {modalLoading ? "処理中..." : "実行"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* チャット開始モーダル */}
            {showChatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-xl font-bold text-white mb-4">チャット開始 - {data.user.name}</h2>
                        <form onSubmit={handleCreateChat} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">件名（任意）</label>
                                <input
                                    type="text"
                                    value={chatSubject}
                                    onChange={(e) => setChatSubject(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    placeholder="例: 入金確認のお願い"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">メッセージ</label>
                                <textarea
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
                                    rows={4}
                                    placeholder="メッセージを入力してください"
                                    required
                                />
                            </div>
                            {modalError && (
                                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                                    {modalError}
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowChatModal(false); setModalError("") }}
                                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={modalLoading}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                                >
                                    {modalLoading ? "送信中..." : "送信"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

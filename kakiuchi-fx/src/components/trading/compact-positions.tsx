"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

interface Position {
    id: string
    symbol: string
    side: "BUY" | "SELL"
    quantity: number
    entryPrice: number
    stopLoss: number | null
    takeProfit: number | null
    pnl: number
    currentPrice: number
    accumulatedSwap: number
}

interface Order {
    id: string
    symbol: string
    side: "BUY" | "SELL"
    orderType: "LIMIT" | "STOP"
    quantity: number
    price: number
}

interface ClosedPosition {
    id: string
    symbol: string
    side: "BUY" | "SELL"
    quantity: number
    entryPrice: number
    closePrice: number | null
    pnl: number | null
    openedAt: string
    closedAt: string | null
}

interface CompactPositionsProps {
    currentBid: number
    currentAsk: number
}

type TabType = "positions" | "orders" | "history"

interface EditingState {
    positionId: string
    field: "stopLoss" | "takeProfit"
    value: string
}

export function CompactPositions({ currentBid, currentAsk }: CompactPositionsProps) {
    const router = useRouter()
    const [positions, setPositions] = useState<Position[]>([])
    const [orders, setOrders] = useState<Order[]>([])
    const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([])
    const [loading, setLoading] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<TabType>("positions")
    const [editing, setEditing] = useState<EditingState | null>(null)
    const [savingSlTp, setSavingSlTp] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/positions/summary")
            if (res.ok) {
                const data = await res.json()
                setPositions(data.positions || [])
                setOrders(data.pendingOrders || [])
                setClosedPositions(data.closedPositions || [])
            }
        } catch {
            // ignore
        }
    }, [])

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 2000)
        return () => clearInterval(interval)
    }, [fetchData])

    // 含み損益を現在価格で再計算
    const calculatePnl = (position: Position) => {
        const closePrice = position.side === "BUY" ? currentBid : currentAsk
        const diff = position.side === "BUY"
            ? closePrice - position.entryPrice
            : position.entryPrice - closePrice
        return diff * position.quantity * 10000 // 1ロット = 10000 GBP
    }

    const totalPnl = positions.reduce((acc, pos) => acc + calculatePnl(pos), 0)

    const handleClosePosition = async (id: string) => {
        if (!confirm("このポジションを決済しますか？")) return
        setLoading(id)
        try {
            const res = await fetch(`/api/positions/${id}`, { method: "DELETE" })
            if (res.ok) {
                fetchData()
                router.refresh()
            } else {
                const data = await res.json()
                alert(data.error || "決済に失敗しました")
            }
        } catch {
            alert("エラーが発生しました")
        } finally {
            setLoading(null)
        }
    }

    const handleCancelOrder = async (id: string) => {
        if (!confirm("この注文をキャンセルしますか？")) return
        setLoading(id)
        try {
            const res = await fetch(`/api/orders/${id}`, { method: "DELETE" })
            if (res.ok) {
                fetchData()
                router.refresh()
            } else {
                const data = await res.json()
                alert(data.error || "キャンセルに失敗しました")
            }
        } catch {
            alert("エラーが発生しました")
        } finally {
            setLoading(null)
        }
    }

    // SL/TP編集開始
    const handleStartEdit = (positionId: string, field: "stopLoss" | "takeProfit", currentValue: number | null) => {
        setEditing({
            positionId,
            field,
            value: currentValue !== null ? currentValue.toFixed(3) : ""
        })
    }

    // SL/TP保存
    const handleSaveSlTp = async () => {
        if (!editing) return
        setSavingSlTp(true)

        try {
            const position = positions.find(p => p.id === editing.positionId)
            if (!position) return

            const newValue = editing.value.trim() === "" ? null : parseFloat(editing.value)

            const payload: { stopLoss?: number | null; takeProfit?: number | null } = {}
            if (editing.field === "stopLoss") {
                payload.stopLoss = newValue
                payload.takeProfit = position.takeProfit
            } else {
                payload.takeProfit = newValue
                payload.stopLoss = position.stopLoss
            }

            const res = await fetch(`/api/positions/${editing.positionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                fetchData()
                setEditing(null)
            } else {
                const data = await res.json()
                alert(data.error || "SL/TPの更新に失敗しました")
            }
        } catch {
            alert("エラーが発生しました")
        } finally {
            setSavingSlTp(false)
        }
    }

    // 編集キャンセル
    const handleCancelEdit = () => {
        setEditing(null)
    }

    // 編集モード時にinputにフォーカス
    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [editing])

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleString('ja-JP', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            {/* タブヘッダー */}
            <div className="flex border-b border-slate-800">
                <button
                    onClick={() => setActiveTab("positions")}
                    className={`px-4 py-2 text-xs font-medium transition-colors ${activeTab === "positions"
                        ? "bg-slate-800 text-white border-b-2 border-blue-500"
                        : "text-slate-400 hover:text-white"
                        }`}
                >
                    ポジション ({positions.length})
                </button>
                <button
                    onClick={() => setActiveTab("orders")}
                    className={`px-4 py-2 text-xs font-medium transition-colors ${activeTab === "orders"
                        ? "bg-slate-800 text-white border-b-2 border-blue-500"
                        : "text-slate-400 hover:text-white"
                        }`}
                >
                    待機注文 ({orders.length})
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`px-4 py-2 text-xs font-medium transition-colors ${activeTab === "history"
                        ? "bg-slate-800 text-white border-b-2 border-blue-500"
                        : "text-slate-400 hover:text-white"
                        }`}
                >
                    履歴
                </button>
                {/* トータル損益 */}
                <div className="ml-auto px-4 py-2 flex items-center gap-2 border-l border-slate-800">
                    <span className="text-xs text-slate-500">損益:</span>
                    <span className={`text-sm font-bold font-mono ${currentBid <= 0 ? 'text-slate-500' :
                        totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {currentBid <= 0 ? "---" : `$${totalPnl.toFixed(2)}`}
                    </span>
                </div>
            </div>

            {/* コンテンツ */}
            <div className="max-h-[150px] overflow-y-auto">
                {activeTab === "positions" && (
                    positions.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-sm">
                            保有ポジションなし
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-slate-900">
                                <tr className="text-slate-500">
                                    <th className="text-left py-1.5 px-3">シンボル</th>
                                    <th className="text-left py-1.5 px-2">方向</th>
                                    <th className="text-right py-1.5 px-2">ロット</th>
                                    <th className="text-right py-1.5 px-2">エントリー</th>
                                    <th className="text-right py-1.5 px-2">現在</th>
                                    <th className="text-right py-1.5 px-2">S/L</th>
                                    <th className="text-right py-1.5 px-2">T/P</th>
                                    <th className="text-right py-1.5 px-2">スワップ</th>
                                    <th className="text-right py-1.5 px-2">損益</th>
                                    <th className="text-center py-1.5 px-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {positions.map((pos) => {
                                    const pnl = calculatePnl(pos)
                                    const currentPrice = pos.side === "BUY" ? currentBid : currentAsk
                                    return (
                                        <tr key={pos.id} className="border-t border-slate-800/50 hover:bg-slate-800/30">
                                            <td className="py-1.5 px-3 text-white font-medium">{pos.symbol}</td>
                                            <td className="py-1.5 px-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${pos.side === "BUY"
                                                    ? "bg-green-500/20 text-green-400"
                                                    : "bg-red-500/20 text-red-400"
                                                    }`}>
                                                    {pos.side}
                                                </span>
                                            </td>
                                            <td className="py-1.5 px-2 text-right text-white font-mono">{pos.quantity.toFixed(2)}</td>
                                            <td className="py-1.5 px-2 text-right text-white font-mono">{pos.entryPrice.toFixed(3)}</td>
                                            <td className="py-1.5 px-2 text-right text-slate-300 font-mono">
                                                {currentBid > 0 ? currentPrice.toFixed(3) : "---"}
                                            </td>
                                            {/* S/L 編集可能セル */}
                                            <td className="py-1.5 px-1 text-right">
                                                {editing?.positionId === pos.id && editing?.field === "stopLoss" ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            ref={inputRef}
                                                            type="number"
                                                            step="0.001"
                                                            value={editing.value}
                                                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") handleSaveSlTp()
                                                                if (e.key === "Escape") handleCancelEdit()
                                                            }}
                                                            className="w-20 px-1 py-0.5 text-xs text-right bg-slate-700 border border-blue-500 rounded text-white font-mono focus:outline-none"
                                                            disabled={savingSlTp}
                                                        />
                                                        <button
                                                            onClick={handleSaveSlTp}
                                                            disabled={savingSlTp}
                                                            className="px-1 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 rounded text-white"
                                                        >
                                                            {savingSlTp ? "..." : "✓"}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStartEdit(pos.id, "stopLoss", pos.stopLoss)}
                                                        className="text-slate-400 hover:text-red-400 font-mono text-xs cursor-pointer hover:underline"
                                                        title="クリックして編集"
                                                    >
                                                        {pos.stopLoss ? pos.stopLoss.toFixed(3) : "---"}
                                                    </button>
                                                )}
                                            </td>
                                            {/* T/P 編集可能セル */}
                                            <td className="py-1.5 px-1 text-right">
                                                {editing?.positionId === pos.id && editing?.field === "takeProfit" ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            ref={inputRef}
                                                            type="number"
                                                            step="0.001"
                                                            value={editing.value}
                                                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") handleSaveSlTp()
                                                                if (e.key === "Escape") handleCancelEdit()
                                                            }}
                                                            className="w-20 px-1 py-0.5 text-xs text-right bg-slate-700 border border-blue-500 rounded text-white font-mono focus:outline-none"
                                                            disabled={savingSlTp}
                                                        />
                                                        <button
                                                            onClick={handleSaveSlTp}
                                                            disabled={savingSlTp}
                                                            className="px-1 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 rounded text-white"
                                                        >
                                                            {savingSlTp ? "..." : "✓"}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStartEdit(pos.id, "takeProfit", pos.takeProfit)}
                                                        className="text-slate-400 hover:text-green-400 font-mono text-xs cursor-pointer hover:underline"
                                                        title="クリックして編集"
                                                    >
                                                        {pos.takeProfit ? pos.takeProfit.toFixed(3) : "---"}
                                                    </button>
                                                )}
                                            </td>
                                            {/* スワップ列 */}
                                            <td className={`py-1.5 px-2 text-right font-mono text-xs ${
                                                pos.accumulatedSwap >= 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {pos.accumulatedSwap === 0 ? "---" : `$${pos.accumulatedSwap.toFixed(2)}`}
                                            </td>
                                            <td className={`py-1.5 px-2 text-right font-mono font-medium ${currentBid <= 0 ? 'text-slate-500' :
                                                pnl >= 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                {currentBid <= 0 ? "---" : `$${pnl.toFixed(2)}`}
                                            </td>
                                            <td className="py-1.5 px-2 text-center">
                                                <button
                                                    onClick={() => handleClosePosition(pos.id)}
                                                    disabled={loading === pos.id}
                                                    className="px-2 py-0.5 rounded bg-red-600/80 hover:bg-red-600 text-white text-[10px] font-medium disabled:opacity-50"
                                                >
                                                    {loading === pos.id ? "..." : "決済"}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )
                )}

                {activeTab === "orders" && (
                    orders.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-sm">
                            待機中の注文なし
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-slate-900">
                                <tr className="text-slate-500">
                                    <th className="text-left py-1.5 px-3">シンボル</th>
                                    <th className="text-left py-1.5 px-2">タイプ</th>
                                    <th className="text-left py-1.5 px-2">方向</th>
                                    <th className="text-right py-1.5 px-2">ロット</th>
                                    <th className="text-right py-1.5 px-2">価格</th>
                                    <th className="text-center py-1.5 px-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order.id} className="border-t border-slate-800/50 hover:bg-slate-800/30">
                                        <td className="py-1.5 px-3 text-white font-medium">{order.symbol}</td>
                                        <td className="py-1.5 px-2">
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400">
                                                {order.orderType === "LIMIT" ? "指値" : "逆指値"}
                                            </span>
                                        </td>
                                        <td className="py-1.5 px-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${order.side === "BUY"
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-red-500/20 text-red-400"
                                                }`}>
                                                {order.side}
                                            </span>
                                        </td>
                                        <td className="py-1.5 px-2 text-right text-white font-mono">{order.quantity.toFixed(2)}</td>
                                        <td className="py-1.5 px-2 text-right text-white font-mono">{order.price.toFixed(3)}</td>
                                        <td className="py-1.5 px-2 text-center">
                                            <button
                                                onClick={() => handleCancelOrder(order.id)}
                                                disabled={loading === order.id}
                                                className="px-2 py-0.5 rounded bg-slate-600 hover:bg-slate-500 text-white text-[10px] font-medium disabled:opacity-50"
                                            >
                                                {loading === order.id ? "..." : "取消"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}

                {activeTab === "history" && (
                    closedPositions.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-sm">
                            取引履歴なし
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-slate-900">
                                <tr className="text-slate-500">
                                    <th className="text-left py-1.5 px-3">決済日時</th>
                                    <th className="text-left py-1.5 px-2">シンボル</th>
                                    <th className="text-left py-1.5 px-2">方向</th>
                                    <th className="text-right py-1.5 px-2">ロット</th>
                                    <th className="text-right py-1.5 px-2">エントリー</th>
                                    <th className="text-right py-1.5 px-2">決済</th>
                                    <th className="text-right py-1.5 px-2">損益</th>
                                </tr>
                            </thead>
                            <tbody>
                                {closedPositions.map((pos) => (
                                    <tr key={pos.id} className="border-t border-slate-800/50 hover:bg-slate-800/30">
                                        <td className="py-1.5 px-3 text-slate-400">{pos.closedAt ? formatTime(pos.closedAt) : "---"}</td>
                                        <td className="py-1.5 px-2 text-white font-medium">{pos.symbol}</td>
                                        <td className="py-1.5 px-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${pos.side === "BUY"
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-red-500/20 text-red-400"
                                                }`}>
                                                {pos.side}
                                            </span>
                                        </td>
                                        <td className="py-1.5 px-2 text-right text-white font-mono">{pos.quantity.toFixed(2)}</td>
                                        <td className="py-1.5 px-2 text-right text-slate-400 font-mono">{pos.entryPrice.toFixed(3)}</td>
                                        <td className="py-1.5 px-2 text-right text-white font-mono">{pos.closePrice?.toFixed(3) || "---"}</td>
                                        <td className={`py-1.5 px-2 text-right font-mono font-medium ${pos.pnl === null ? 'text-slate-500' :
                                            pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                            {pos.pnl !== null ? `$${pos.pnl.toFixed(2)}` : "---"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>
        </div>
    )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { bigIntToPrice, bigIntToLot } from "@/lib/utils/bigint"
import { translateStatus, formatDate } from "@/lib/utils"

interface Order {
    id: string
    symbol: string
    side: "BUY" | "SELL"
    orderType: "LIMIT" | "STOP"
    quantity: bigint
    price: bigint | null
    stopLoss: bigint | null
    takeProfit: bigint | null
    createdAt: Date
}

interface PendingOrdersTableProps {
    orders: Order[]
}

export function PendingOrdersTable({ orders }: PendingOrdersTableProps) {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)
    const [confirmCancel, setConfirmCancel] = useState<Order | null>(null)

    const handleCancelOrder = async (order: Order) => {
        setLoading(order.id)
        setConfirmCancel(null)

        try {
            const res = await fetch(`/api/orders/${order.id}`, {
                method: "DELETE",
            })

            const data = await res.json()

            if (!res.ok) {
                alert(data.error || "キャンセルに失敗しました")
                return
            }

            router.refresh()
        } catch (error) {
            alert("エラーが発生しました")
        } finally {
            setLoading(null)
        }
    }

    if (orders.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-400">待機中の注文はありません</p>
            </div>
        )
    }

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">シンボル</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">方向</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">種別</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">ロット</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">指値価格</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">SL</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">TP</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">注文日時</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                <td className="py-4 px-4 text-white font-medium">{order.symbol}</td>
                                <td className="py-4 px-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${order.side === 'BUY'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {translateStatus(order.side)}
                                    </span>
                                </td>
                                <td className="py-4 px-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${order.orderType === 'LIMIT'
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : 'bg-orange-500/20 text-orange-400'
                                        }`}>
                                        {order.orderType === 'LIMIT' ? '指値' : '逆指値'}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-right text-white">
                                    {bigIntToLot(order.quantity).toFixed(2)}
                                </td>
                                <td className="py-4 px-4 text-right text-white font-mono">
                                    {order.price ? bigIntToPrice(order.price).toFixed(3) : "---"}
                                </td>
                                <td className="py-4 px-4 text-right text-slate-400 font-mono">
                                    {order.stopLoss ? bigIntToPrice(order.stopLoss).toFixed(3) : "---"}
                                </td>
                                <td className="py-4 px-4 text-right text-slate-400 font-mono">
                                    {order.takeProfit ? bigIntToPrice(order.takeProfit).toFixed(3) : "---"}
                                </td>
                                <td className="py-4 px-4 text-right text-slate-400 text-sm">
                                    {formatDate(order.createdAt)}
                                </td>
                                <td className="py-4 px-4 text-center">
                                    <button
                                        onClick={() => setConfirmCancel(order)}
                                        disabled={loading === order.id}
                                        className="px-3 py-1.5 rounded bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        {loading === order.id ? "処理中..." : "キャンセル"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* キャンセル確認ダイアログ */}
            {confirmCancel && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold text-white mb-4">注文キャンセル</h3>
                        <p className="text-slate-300 mb-4">
                            以下の注文をキャンセルしますか？
                        </p>
                        <div className="bg-slate-900 rounded p-4 mb-4">
                            <p className="text-white">
                                <span className="text-slate-400">シンボル: </span>{confirmCancel.symbol}
                            </p>
                            <p className="text-white">
                                <span className="text-slate-400">方向: </span>
                                <span className={confirmCancel.side === "BUY" ? "text-green-400" : "text-red-400"}>
                                    {translateStatus(confirmCancel.side)}
                                </span>
                            </p>
                            <p className="text-white">
                                <span className="text-slate-400">種別: </span>
                                {confirmCancel.orderType === 'LIMIT' ? '指値' : '逆指値'}
                            </p>
                            <p className="text-white">
                                <span className="text-slate-400">価格: </span>
                                {confirmCancel.price ? bigIntToPrice(confirmCancel.price).toFixed(3) : "---"}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmCancel(null)}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                            >
                                戻る
                            </button>
                            <button
                                onClick={() => handleCancelOrder(confirmCancel)}
                                disabled={loading === confirmCancel.id}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                            >
                                {loading === confirmCancel.id ? "処理中..." : "キャンセル"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

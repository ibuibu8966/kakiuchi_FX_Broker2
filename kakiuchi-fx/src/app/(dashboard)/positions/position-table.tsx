"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { bigIntToPrice, bigIntToLot, formatAmount, calculateUnrealizedPnl, priceToBigInt } from "@/lib/utils/bigint"
import { translateStatus, formatDate } from "@/lib/utils"

interface Position {
    id: string
    symbol: string
    side: "BUY" | "SELL"
    quantity: bigint
    entryPrice: bigint
    stopLoss: bigint | null
    takeProfit: bigint | null
    margin: bigint
    openedAt: Date
}

interface PositionTableProps {
    positions: Position[]
    currentBid: number
    currentAsk: number
}

export function PositionTable({ positions, currentBid: initialBid, currentAsk: initialAsk }: PositionTableProps) {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)
    const [editingPosition, setEditingPosition] = useState<Position | null>(null)
    const [slValue, setSlValue] = useState("")
    const [tpValue, setTpValue] = useState("")
    const [confirmClose, setConfirmClose] = useState<Position | null>(null)

    // リアルタイム価格ステート
    const [currentBid, setCurrentBid] = useState(initialBid)
    const [currentAsk, setCurrentAsk] = useState(initialAsk)
    const [priceSource, setPriceSource] = useState<string>("loading")
    const [isMaintenance, setIsMaintenance] = useState(false)

    // 1秒ごとに価格APIから取得
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const res = await fetch("/api/price")
                const data = await res.json()

                if (data.maintenance) {
                    setIsMaintenance(true)
                } else if (res.ok) {
                    setIsMaintenance(false)
                    setCurrentBid(data.bid)
                    setCurrentAsk(data.ask)
                    setPriceSource(data.source)
                }
            } catch (error) {
                console.error("Price fetch error:", error)
                setIsMaintenance(true)
            }
        }

        // 初回取得
        fetchPrice()

        // 1秒ごとに更新
        const interval = setInterval(fetchPrice, 1000)
        return () => clearInterval(interval)
    }, [])

    // 含み損益計算
    const calculatePnl = (position: Position) => {
        const currentPrice = position.side === "BUY"
            ? priceToBigInt(currentBid)
            : priceToBigInt(currentAsk)
        return calculateUnrealizedPnl(
            position.side,
            position.quantity,
            position.entryPrice,
            currentPrice
        )
    }

    // トータル含み損益
    const totalPnl = positions.reduce((acc, pos) => acc + calculatePnl(pos), 0n)

    // SL/TP編集開始
    const startEdit = (position: Position) => {
        setEditingPosition(position)
        setSlValue(position.stopLoss ? bigIntToPrice(position.stopLoss).toFixed(3) : "")
        setTpValue(position.takeProfit ? bigIntToPrice(position.takeProfit).toFixed(3) : "")
    }

    // SL/TP更新
    const handleUpdateSlTp = async () => {
        if (!editingPosition) return
        setLoading(editingPosition.id)

        try {
            const res = await fetch(`/api/positions/${editingPosition.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stopLoss: slValue ? parseFloat(slValue) : null,
                    takeProfit: tpValue ? parseFloat(tpValue) : null,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                alert(data.error || "更新に失敗しました")
                return
            }

            setEditingPosition(null)
            router.refresh()
        } catch (error) {
            alert("エラーが発生しました")
        } finally {
            setLoading(null)
        }
    }

    // ポジション決済
    const handleClosePosition = async (position: Position) => {
        setLoading(position.id)
        setConfirmClose(null)

        try {
            const res = await fetch(`/api/positions/${position.id}`, {
                method: "DELETE",
            })

            const data = await res.json()

            if (!res.ok) {
                alert(data.error || "決済に失敗しました")
                return
            }

            alert(`決済完了\n決済価格: ${data.closePrice}\n損益: ¥${data.pnl.toFixed(2)}`)
            router.refresh()
        } catch (error) {
            alert("エラーが発生しました")
        } finally {
            setLoading(null)
        }
    }

    if (positions.length === 0) {
        return (
            <div className="text-center py-16">
                <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-slate-400 text-lg">保有中のポジションはありません</p>
                <p className="text-slate-500 text-sm mt-1">取引画面から新規注文を行ってください</p>
            </div>
        )
    }

    return (
        <>
            {/* メンテナンス中バナー */}
            {isMaintenance && (
                <div className="mb-4 p-4 rounded-lg bg-orange-500/20 border border-orange-500/50 flex items-center gap-3">
                    <svg className="w-6 h-6 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <p className="text-orange-400 font-medium">現在サーバーメンテナンス中です</p>
                        <p className="text-orange-300/70 text-sm">リアルタイム価格の取得ができません。しばらくお待ちください。</p>
                    </div>
                </div>
            )}

            {/* トータル含み損益 */}
            <div className="mb-4 p-4 rounded-lg bg-slate-800/50 flex items-center justify-between">
                <span className="text-slate-400">トータル含み損益</span>
                <span className={`text-2xl font-bold ${isMaintenance ? 'text-slate-500' : Number(totalPnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {isMaintenance ? "---" : formatAmount(totalPnl)}
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">シンボル</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">方向</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">ロット</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">エントリー</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">現在価格</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">SL</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">TP</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">含み損益</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {positions.map((position) => {
                            const pnl = calculatePnl(position)
                            const currentPrice = position.side === "BUY" ? currentBid : currentAsk

                            return (
                                <tr key={position.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                    <td className="py-4 px-4 text-white font-medium">{position.symbol}</td>
                                    <td className="py-4 px-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${position.side === 'BUY'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {translateStatus(position.side)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-right text-white">
                                        {bigIntToLot(position.quantity).toFixed(2)}
                                    </td>
                                    <td className="py-4 px-4 text-right text-white font-mono">
                                        {bigIntToPrice(position.entryPrice).toFixed(3)}
                                    </td>
                                    <td className="py-4 px-4 text-right text-slate-300 font-mono">
                                        {currentPrice.toFixed(3)}
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <button
                                            onClick={() => startEdit(position)}
                                            className="text-slate-400 hover:text-white font-mono transition-colors"
                                        >
                                            {position.stopLoss ? bigIntToPrice(position.stopLoss).toFixed(3) : "---"}
                                        </button>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <button
                                            onClick={() => startEdit(position)}
                                            className="text-slate-400 hover:text-white font-mono transition-colors"
                                        >
                                            {position.takeProfit ? bigIntToPrice(position.takeProfit).toFixed(3) : "---"}
                                        </button>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <span className={`font-medium ${Number(pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {formatAmount(pnl)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <button
                                            onClick={() => setConfirmClose(position)}
                                            disabled={loading === position.id}
                                            className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {loading === position.id ? "処理中..." : "決済"}
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* SL/TP編集モーダル */}
            {editingPosition && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold text-white mb-4">SL/TP設定</h3>
                        <p className="text-slate-400 text-sm mb-4">
                            {editingPosition.symbol} {translateStatus(editingPosition.side)}
                            @ {bigIntToPrice(editingPosition.entryPrice).toFixed(3)}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Stop Loss (SL)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={slValue}
                                    onChange={(e) => setSlValue(e.target.value)}
                                    placeholder="例: 187.500"
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Take Profit (TP)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={tpValue}
                                    onChange={(e) => setTpValue(e.target.value)}
                                    placeholder="例: 189.500"
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingPosition(null)}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleUpdateSlTp}
                                disabled={loading === editingPosition.id}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                            >
                                {loading === editingPosition.id ? "更新中..." : "更新"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 決済確認ダイアログ */}
            {confirmClose && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold text-white mb-4">ポジション決済</h3>
                        <p className="text-slate-300 mb-4">
                            以下のポジションを決済しますか？
                        </p>
                        <div className="bg-slate-900 rounded p-4 mb-4">
                            <p className="text-white">
                                <span className="text-slate-400">シンボル: </span>{confirmClose.symbol}
                            </p>
                            <p className="text-white">
                                <span className="text-slate-400">方向: </span>
                                <span className={confirmClose.side === "BUY" ? "text-green-400" : "text-red-400"}>
                                    {translateStatus(confirmClose.side)}
                                </span>
                            </p>
                            <p className="text-white">
                                <span className="text-slate-400">ロット: </span>
                                {bigIntToLot(confirmClose.quantity).toFixed(2)}
                            </p>
                            <p className="text-white">
                                <span className="text-slate-400">含み損益: </span>
                                <span className={Number(calculatePnl(confirmClose)) >= 0 ? "text-green-400" : "text-red-400"}>
                                    {formatAmount(calculatePnl(confirmClose))}
                                </span>
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmClose(null)}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={() => handleClosePosition(confirmClose)}
                                disabled={loading === confirmClose.id}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                            >
                                {loading === confirmClose.id ? "処理中..." : "決済する"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWebSocketPrice } from "@/hooks/useWebSocketPrice"
import { CompactPositions } from "@/components/trading/compact-positions"
import { useCustomerData } from "@/contexts/customer-data-context"

// チャートはSSRを無効化（windowオブジェクトを使用するため）
const TradingChart = dynamic(
    () => import("@/components/trading/chart").then(mod => mod.TradingChart),
    { ssr: false, loading: () => <div className="h-[400px] bg-slate-800/50 rounded-lg animate-pulse" /> }
)

export default function TradePage() {
    // Get account and settings from context (prefetched)
    const { account: contextAccount, settings, refreshAccount } = useCustomerData()

    // WebSocket for real-time price (with HTTP polling fallback)
    const { price: wsPrice, isMarketClosed } = useWebSocketPrice(50)
    const [price, setPrice] = useState({ bid: 0, ask: 0, timestamp: "" })
    const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET")
    const [side, setSide] = useState<"BUY" | "SELL">("BUY")
    const [lots, setLots] = useState("0.01")
    const [limitPrice, setLimitPrice] = useState("")
    const [stopLoss, setStopLoss] = useState("")
    const [takeProfit, setTakeProfit] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // Use account from context
    const account = contextAccount

    // Use swap settings from context
    const swapSettings = settings ? {
        swapBuy: settings.swapBuy,
        swapSell: settings.swapSell,
    } : { swapBuy: 0, swapSell: 0 }

    // Update price from WebSocket only when market is open
    useEffect(() => {
        if (wsPrice && !isMarketClosed) {
            setPrice({
                bid: wsPrice.bid,
                ask: wsPrice.ask,
                timestamp: wsPrice.timestamp,
            })
        }
    }, [wsPrice, isMarketClosed])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        try {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    side,
                    orderType,
                    quantity: parseFloat(lots),
                    price: orderType !== "MARKET" ? parseFloat(limitPrice) : undefined,
                    stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
                    takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "注文に失敗しました")
            }

            setMessage({ type: "success", text: "注文が執行されました" })
            setLots("0.01")
            setLimitPrice("")
            setStopLoss("")
            setTakeProfit("")
            refreshAccount() // 残高更新
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "エラーが発生しました" })
        } finally {
            setIsSubmitting(false)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value)
    }

    return (
        <div className="h-full flex flex-col gap-2">
            {/* MT4風 上部アカウント情報バー */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    {/* シンボル + スプレッド */}
                    <div className="flex items-center gap-6">
                        <span className="text-lg font-bold text-white">GBP/JPY</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                            1Lot = 100,000 GBP
                        </span>
                        {/* 市場クローズ表示 */}
                        {isMarketClosed && (
                            <span className="px-3 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                                🔒 市場クローズ中
                            </span>
                        )}
                    </div>
                </div>

                {/* 口座情報 */}
                <div className="flex items-center gap-6 text-sm">
                    <div>
                        <span className="text-slate-500">残高</span>
                        <span className="ml-2 text-white font-mono">{account ? formatCurrency(account.balance) : "---"}</span>
                    </div>
                    <div className="border-l border-slate-700 pl-6">
                        <span className="text-slate-500">有効証拠金</span>
                        <span className="ml-2 text-white font-mono">{account ? formatCurrency(account.equity) : "---"}</span>
                    </div>
                    <div className="border-l border-slate-700 pl-6">
                        <span className="text-slate-500">余剰証拠金</span>
                        <span className={`ml-2 font-mono ${account && account.freeMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {account ? formatCurrency(account.freeMargin) : "---"}
                        </span>
                    </div>
                    <div className="border-l border-slate-700 pl-6">
                        <span className="text-slate-500">証拠金維持率</span>
                        <span className={`ml-2 font-mono ${!account || account.marginLevel === 0 ? 'text-slate-400' :
                            account.marginLevel < 50 ? 'text-red-400' :
                                account.marginLevel < 100 ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                            {account && account.marginLevel > 0 ? `${account.marginLevel.toFixed(1)}%` : "---"}
                        </span>
                    </div>
                </div>
            </div>

            {/* メインコンテンツ */}
            <div className="flex-1 grid grid-cols-12 gap-2">
                {/* 左側: チャート + 価格 */}
                <div className="col-span-12 lg:col-span-9 flex flex-col gap-2">
                    {/* 価格パネル */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* SELL価格 */}
                        <button
                            type="button"
                            onClick={() => setSide("SELL")}
                            disabled={isMarketClosed}
                            className={`relative p-4 rounded-lg border transition-all ${isMarketClosed
                                ? "bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed"
                                : side === "SELL"
                                    ? "bg-red-500/20 border-red-500 ring-1 ring-red-500"
                                    : "bg-slate-900 border-slate-800 hover:border-red-500/50"
                                }`}
                        >
                            <div className="text-xs text-red-400 mb-1">
                                {isMarketClosed ? "CLOSED" : "SELL"}
                            </div>
                            <div className={`text-3xl font-bold font-mono tracking-tight ${isMarketClosed ? "text-slate-500" : "text-red-400"}`}>
                                {price.bid > 0 ? price.bid.toFixed(3) : "---"}
                            </div>
                            {side === "SELL" && !isMarketClosed && (
                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            )}
                        </button>

                        {/* BUY価格 */}
                        <button
                            type="button"
                            onClick={() => setSide("BUY")}
                            disabled={isMarketClosed}
                            className={`relative p-4 rounded-lg border transition-all ${isMarketClosed
                                ? "bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed"
                                : side === "BUY"
                                    ? "bg-green-500/20 border-green-500 ring-1 ring-green-500"
                                    : "bg-slate-900 border-slate-800 hover:border-green-500/50"
                                }`}
                        >
                            <div className="text-xs text-green-400 mb-1">
                                {isMarketClosed ? "CLOSED" : "BUY"}
                            </div>
                            <div className={`text-3xl font-bold font-mono tracking-tight ${isMarketClosed ? "text-slate-500" : "text-green-400"}`}>
                                {price.ask > 0 ? price.ask.toFixed(3) : "---"}
                            </div>
                            {side === "BUY" && !isMarketClosed && (
                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            )}
                        </button>
                    </div>

                    {/* チャート */}
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 min-h-[300px]">
                        <TradingChart currentBid={price.bid} currentAsk={price.ask} />
                    </div>

                    {/* ポジション・待機注文パネル */}
                    <CompactPositions currentBid={price.bid} currentAsk={price.ask} />
                </div>

                {/* 右側: 注文パネル */}
                <div className="col-span-12 lg:col-span-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-full">
                        <h3 className="text-white font-bold mb-4 pb-2 border-b border-slate-800">新規注文</h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* 注文タイプ */}
                            <div>
                                <label className="text-xs text-slate-500 block mb-1.5">注文タイプ</label>
                                <div className="grid grid-cols-3 gap-1">
                                    {(["MARKET", "LIMIT", "STOP"] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setOrderType(type)}
                                            className={`py-1.5 rounded text-xs font-medium transition-all ${orderType === type
                                                ? "bg-blue-600 text-white"
                                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                                }`}
                                        >
                                            {type === "MARKET" ? "成行" : type === "LIMIT" ? "指値" : "逆指値"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ロット */}
                            <div>
                                <label className="text-xs text-slate-500 block mb-1.5">ロット数</label>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setLots(prev => Math.max(0.01, parseFloat(prev) - 0.01).toFixed(2))}
                                        className="w-8 h-8 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 flex items-center justify-center"
                                    >
                                        −
                                    </button>
                                    <Input
                                        type="number"
                                        value={lots}
                                        onChange={(e) => setLots(e.target.value)}
                                        step="0.01"
                                        min="0.01"
                                        max="100"
                                        className="bg-slate-800 border-slate-700 text-white text-center font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setLots(prev => Math.min(100, parseFloat(prev) + 0.01).toFixed(2))}
                                        className="w-8 h-8 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 flex items-center justify-center"
                                    >
                                        +
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    = {(parseFloat(lots || "0") * 100000).toLocaleString()} GBP
                                </p>
                            </div>

                            {/* 指値/逆指値価格 */}
                            {orderType !== "MARKET" && (
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1.5">
                                        {orderType === "LIMIT" ? "指値価格" : "逆指値価格"}
                                    </label>
                                    <Input
                                        type="number"
                                        value={limitPrice}
                                        onChange={(e) => setLimitPrice(e.target.value)}
                                        step="0.001"
                                        placeholder={price.bid > 0 ? price.bid.toFixed(3) : "---"}
                                        className="bg-slate-800 border-slate-700 text-white font-mono"
                                    />
                                </div>
                            )}

                            {/* SL/TP */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1.5">S/L</label>
                                    <Input
                                        type="number"
                                        value={stopLoss}
                                        onChange={(e) => setStopLoss(e.target.value)}
                                        step="0.001"
                                        placeholder="任意"
                                        className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1.5">T/P</label>
                                    <Input
                                        type="number"
                                        value={takeProfit}
                                        onChange={(e) => setTakeProfit(e.target.value)}
                                        step="0.001"
                                        placeholder="任意"
                                        className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                                    />
                                </div>
                            </div>

                            {/* スワップ情報 */}
                            <div className="p-2 rounded bg-slate-800/50 border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">スワップ（1日あたり）</p>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">BUY:</span>
                                    <span className={swapSettings.swapBuy >= 0 ? "text-green-400" : "text-red-400"}>
                                        {swapSettings.swapBuy >= 0 ? "+" : ""}{swapSettings.swapBuy.toFixed(1)} pt
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">SELL:</span>
                                    <span className={swapSettings.swapSell >= 0 ? "text-green-400" : "text-red-400"}>
                                        {swapSettings.swapSell >= 0 ? "+" : ""}{swapSettings.swapSell.toFixed(1)} pt
                                    </span>
                                </div>
                            </div>

                            {/* メッセージ */}
                            {message && (
                                <div className={`p-2 rounded text-xs ${message.type === "success"
                                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                                    }`}>
                                    {message.text}
                                </div>
                            )}

                            {/* 市場クローズ警告 */}
                            {isMarketClosed && (
                                <div className="p-2 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20 text-center">
                                    🔒 市場がクローズしています。取引できません。
                                </div>
                            )}

                            {/* 注文ボタン */}
                            <Button
                                type="submit"
                                disabled={isSubmitting || price.bid <= 0 || isMarketClosed}
                                className={`w-full py-5 text-base font-bold ${isMarketClosed
                                    ? "bg-slate-600 cursor-not-allowed"
                                    : side === "BUY"
                                        ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                                        : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                                    }`}
                            >
                                {isMarketClosed ? "市場クローズ中" : isSubmitting ? "処理中..." : side === "BUY"
                                    ? `買い @ ${price.ask > 0 ? price.ask.toFixed(3) : "---"}`
                                    : `売り @ ${price.bid > 0 ? price.bid.toFixed(3) : "---"}`
                                }
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}


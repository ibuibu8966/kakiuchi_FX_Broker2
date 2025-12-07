"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// チャートはSSRを無効化（windowオブジェクトを使用するため）
const TradingChart = dynamic(
    () => import("@/components/trading/chart").then(mod => mod.TradingChart),
    { ssr: false, loading: () => <div className="h-[400px] bg-slate-800/50 rounded-lg animate-pulse" /> }
)

// モック価格生成（本番ではPusherから受信）
function generateMockPrice() {
    const basePrice = 188.500
    const variation = (Math.random() - 0.5) * 0.5
    const bid = basePrice + variation
    const spread = 0.02 + Math.random() * 0.01
    const ask = bid + spread
    return {
        bid: Math.round(bid * 10000) / 10000,
        ask: Math.round(ask * 10000) / 10000,
        timestamp: new Date().toISOString(),
    }
}

export default function TradePage() {
    const [price, setPrice] = useState({ bid: 188.450, ask: 188.470, timestamp: "" })
    const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET")
    const [side, setSide] = useState<"BUY" | "SELL">("BUY")
    const [lots, setLots] = useState("0.01")
    const [limitPrice, setLimitPrice] = useState("")
    const [stopLoss, setStopLoss] = useState("")
    const [takeProfit, setTakeProfit] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // 価格更新（モックモード）
    useEffect(() => {
        const interval = setInterval(() => {
            setPrice(generateMockPrice())
        }, 1000)
        return () => clearInterval(interval)
    }, [])

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
            // リセット
            setLots("0.01")
            setLimitPrice("")
            setStopLoss("")
            setTakeProfit("")
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "エラーが発生しました" })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">取引</h1>
                <span className="text-sm text-slate-400">
                    GBP/JPY | 1ロット = 10,000 GBP
                </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* 価格表示 */}
                <div className="lg:col-span-2 space-y-6">
                    {/* リアルタイム価格 */}
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-6 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <p className="text-sm text-red-400 mb-2">SELL (Bid)</p>
                                    <p className="text-4xl font-bold text-red-400 font-mono">
                                        {price.bid.toFixed(3)}
                                    </p>
                                </div>
                                <div className="text-center p-6 rounded-xl bg-green-500/10 border border-green-500/20">
                                    <p className="text-sm text-green-400 mb-2">BUY (Ask)</p>
                                    <p className="text-4xl font-bold text-green-400 font-mono">
                                        {price.ask.toFixed(3)}
                                    </p>
                                </div>
                            </div>
                            <p className="text-center text-sm text-slate-500 mt-4">
                                スプレッド: {((price.ask - price.bid) * 100).toFixed(1)} pips
                            </p>
                        </CardContent>
                    </Card>

                    {/* チャート */}
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white">GBP/JPY チャート</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TradingChart currentBid={price.bid} currentAsk={price.ask} />
                        </CardContent>
                    </Card>
                </div>

                {/* 注文パネル */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">新規注文</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* 売買選択 */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSide("BUY")}
                                    className={`py-3 rounded-lg font-medium transition-all ${side === "BUY"
                                        ? "bg-green-600 text-white"
                                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                        }`}
                                >
                                    買い (BUY)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSide("SELL")}
                                    className={`py-3 rounded-lg font-medium transition-all ${side === "SELL"
                                        ? "bg-red-600 text-white"
                                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                        }`}
                                >
                                    売り (SELL)
                                </button>
                            </div>

                            {/* 注文タイプ */}
                            <div>
                                <label className="text-sm text-slate-400 block mb-2">注文タイプ</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["MARKET", "LIMIT", "STOP"] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setOrderType(type)}
                                            className={`py-2 rounded-lg text-sm font-medium transition-all ${orderType === type
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
                                <label className="text-sm text-slate-400 block mb-2">ロット数</label>
                                <Input
                                    type="number"
                                    value={lots}
                                    onChange={(e) => setLots(e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                    max="100"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    取引金額: ¥{(parseFloat(lots || "0") * 10000 * price.ask).toLocaleString()}
                                </p>
                            </div>

                            {/* 指値/逆指値価格 */}
                            {orderType !== "MARKET" && (
                                <div>
                                    <label className="text-sm text-slate-400 block mb-2">
                                        {orderType === "LIMIT" ? "指値価格" : "逆指値価格"}
                                    </label>
                                    <Input
                                        type="number"
                                        value={limitPrice}
                                        onChange={(e) => setLimitPrice(e.target.value)}
                                        step="0.001"
                                        placeholder={price.bid.toFixed(3)}
                                        className="bg-slate-800 border-slate-700 text-white"
                                    />
                                </div>
                            )}

                            {/* SL/TP */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-slate-400 block mb-2">損切り (SL)</label>
                                    <Input
                                        type="number"
                                        value={stopLoss}
                                        onChange={(e) => setStopLoss(e.target.value)}
                                        step="0.001"
                                        placeholder="任意"
                                        className="bg-slate-800 border-slate-700 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400 block mb-2">利確 (TP)</label>
                                    <Input
                                        type="number"
                                        value={takeProfit}
                                        onChange={(e) => setTakeProfit(e.target.value)}
                                        step="0.001"
                                        placeholder="任意"
                                        className="bg-slate-800 border-slate-700 text-white"
                                    />
                                </div>
                            </div>

                            {/* メッセージ */}
                            {message && (
                                <div className={`p-3 rounded-lg text-sm ${message.type === "success"
                                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                                    }`}>
                                    {message.text}
                                </div>
                            )}

                            {/* 注文ボタン */}
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full py-6 text-lg font-bold ${side === "BUY"
                                    ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                                    : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                                    }`}
                            >
                                {isSubmitting ? "処理中..." : side === "BUY" ? `買い @ ${price.ask.toFixed(3)}` : `売り @ ${price.bid.toFixed(3)}`}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

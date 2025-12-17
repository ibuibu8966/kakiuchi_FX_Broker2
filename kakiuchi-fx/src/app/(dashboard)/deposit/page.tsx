"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// 会社のUSDTウォレットアドレス（TRC20）
const COMPANY_WALLET_ADDRESS = "TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

export default function DepositPage() {
    const [step, setStep] = useState<"request" | "confirm">("request")
    const [amount, setAmount] = useState("")
    const [txHash, setTxHash] = useState("")
    const [transactionId, setTransactionId] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        try {
            const response = await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "DEPOSIT",
                    amount: parseFloat(amount),
                    network: "TRC20",
                    depositAddress: COMPANY_WALLET_ADDRESS,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "申請に失敗しました")
            }

            setTransactionId(data.transactionId)
            setStep("confirm")
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "エラーが発生しました" })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleTxHashSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        try {
            const response = await fetch(`/api/transactions/${transactionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    txHash,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "送信に失敗しました")
            }

            setMessage({ type: "success", text: "トランザクションIDを送信しました。管理者の確認後、残高に反映されます。" })
            setAmount("")
            setTxHash("")
            setStep("request")
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "エラーが発生しました" })
        } finally {
            setIsSubmitting(false)
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(COMPANY_WALLET_ADDRESS)
        setMessage({ type: "success", text: "アドレスをコピーしました" })
        setTimeout(() => setMessage(null), 2000)
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">入金（USDT）</h1>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* ステップ1: 入金申請 */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${step === "request" ? "bg-blue-500" : "bg-green-500"}`}>
                                {step === "request" ? "1" : "✓"}
                            </span>
                            入金申請
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRequestSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-400 block mb-2">入金額（USDT）</label>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="100"
                                    min="10"
                                    step="0.01"
                                    required
                                    disabled={step !== "request"}
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                                <p className="text-xs text-slate-500 mt-1">最低入金額: 10 USDT</p>
                            </div>

                            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <p className="text-sm text-blue-400">
                                    ネットワーク: <span className="font-bold">TRC20 (TRON)</span>
                                </p>
                            </div>

                            {step === "request" && (
                                <Button type="submit" disabled={isSubmitting} className="w-full">
                                    {isSubmitting ? "処理中..." : "次へ"}
                                </Button>
                            )}
                        </form>
                    </CardContent>
                </Card>

                {/* ステップ2: ウォレットアドレス表示とTxHash入力 */}
                <Card className={`bg-slate-900/50 border-slate-800 ${step !== "confirm" ? "opacity-50" : ""}`}>
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${step === "confirm" ? "bg-blue-500" : "bg-slate-600"}`}>
                                2
                            </span>
                            送金 & 確認
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {step === "confirm" ? (
                            <div className="space-y-4">
                                <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                                    <label className="text-sm text-slate-400 block mb-2">送金先アドレス（TRC20）</label>
                                    <div className="flex gap-2">
                                        <code className="flex-1 p-3 bg-slate-900 rounded text-green-400 text-sm break-all">
                                            {COMPANY_WALLET_ADDRESS}
                                        </code>
                                        <Button type="button" onClick={copyToClipboard} variant="outline" size="sm">
                                            コピー
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                    <p className="text-sm text-yellow-400">
                                        ⚠️ 必ず <span className="font-bold">TRC20ネットワーク</span> で送金してください。
                                        他のネットワークで送金すると資産が失われる可能性があります。
                                    </p>
                                </div>

                                <form onSubmit={handleTxHashSubmit} className="space-y-4">
                                    <div>
                                        <label className="text-sm text-slate-400 block mb-2">トランザクションID（TxHash）</label>
                                        <Input
                                            type="text"
                                            value={txHash}
                                            onChange={(e) => setTxHash(e.target.value)}
                                            placeholder="送金後にトランザクションIDを入力"
                                            required
                                            className="bg-slate-800 border-slate-700 text-white font-mono"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">送金完了後、ウォレットに表示されるTxHashを入力してください</p>
                                    </div>

                                    <Button type="submit" disabled={isSubmitting} className="w-full">
                                        {isSubmitting ? "送信中..." : "送信完了を報告"}
                                    </Button>
                                </form>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <p>ステップ1を完了してください</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {message && (
                <div className={`p-4 rounded-lg text-sm ${message.type === "success"
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                    {message.text}
                </div>
            )}

            <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-6">
                    <h4 className="text-sm font-medium text-white mb-3">ご注意</h4>
                    <ul className="text-xs text-slate-400 space-y-1">
                        <li>• USDT（TRC20）のみ対応しています</li>
                        <li>• 送金確認には通常10-30分かかります</li>
                        <li>• 管理者の確認後、残高に反映されます</li>
                        <li>• 不明な点はサポートまでお問い合わせください</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}

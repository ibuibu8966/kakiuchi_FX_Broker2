"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function DepositPage() {
    const [amount, setAmount] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
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
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "申請に失敗しました")
            }

            setMessage({ type: "success", text: "入金申請を受け付けました。振込確認後、残高に反映されます。" })
            setAmount("")
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "エラーが発生しました" })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">入金</h1>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* 振込先情報 */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">振込先口座情報</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-sm text-blue-400 mb-3">
                                以下の口座へお振込みください。振込名義人はご登録名と同一にしてください。
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between py-2 border-b border-slate-800">
                                <span className="text-slate-400">銀行名</span>
                                <span className="text-white font-medium">○○銀行</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-800">
                                <span className="text-slate-400">支店名</span>
                                <span className="text-white font-medium">○○支店</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-800">
                                <span className="text-slate-400">口座種別</span>
                                <span className="text-white font-medium">普通</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-800">
                                <span className="text-slate-400">口座番号</span>
                                <span className="text-white font-mono font-medium">1234567</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-slate-400">口座名義</span>
                                <span className="text-white font-medium">カキウチ エフエックス</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 入金申請フォーム */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">入金申請</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-400 block mb-2">入金予定額（円）</label>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="10000"
                                    min="1000"
                                    step="1"
                                    required
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                                <p className="text-xs text-slate-500 mt-1">最低入金額: ¥1,000</p>
                            </div>

                            {message && (
                                <div className={`p-3 rounded-lg text-sm ${message.type === "success"
                                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                                    }`}>
                                    {message.text}
                                </div>
                            )}

                            <Button type="submit" disabled={isSubmitting} className="w-full">
                                {isSubmitting ? "処理中..." : "入金申請する"}
                            </Button>
                        </form>

                        <div className="mt-6 p-4 rounded-lg bg-slate-800/50">
                            <h4 className="text-sm font-medium text-white mb-2">ご注意</h4>
                            <ul className="text-xs text-slate-400 space-y-1">
                                <li>• 振込手数料はお客様負担となります</li>
                                <li>• 入金確認には最大1営業日かかる場合があります</li>
                                <li>• ご登録名義と異なる名義からの振込は受け付けできません</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

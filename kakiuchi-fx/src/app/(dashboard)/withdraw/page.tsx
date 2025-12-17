"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function WithdrawPage() {
    const [formData, setFormData] = useState({
        amount: "",
        walletAddress: "",
        network: "TRC20",
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        // アドレス形式の簡易バリデーション
        if (formData.network === "TRC20" && !formData.walletAddress.startsWith("T")) {
            setMessage({ type: "error", text: "TRC20アドレスは「T」で始まる必要があります" })
            setIsSubmitting(false)
            return
        }

        try {
            const response = await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "WITHDRAWAL",
                    amount: parseFloat(formData.amount),
                    walletAddress: formData.walletAddress,
                    network: formData.network,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "申請に失敗しました")
            }

            setMessage({ type: "success", text: "出金申請を受け付けました。管理者の確認後、送金されます。" })
            setFormData({
                amount: "",
                walletAddress: "",
                network: "TRC20",
            })
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "エラーが発生しました" })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">出金（USDT）</h1>

            <Card className="bg-slate-900/50 border-slate-800 max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-white">出金申請</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 block mb-2">出金額（USDT）</label>
                            <Input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                placeholder="100"
                                min="10"
                                step="0.01"
                                required
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                            <p className="text-xs text-slate-500 mt-1">最低出金額: 10 USDT / 出金手数料: 1 USDT</p>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 block mb-2">ネットワーク</label>
                            <select
                                name="network"
                                value={formData.network}
                                onChange={handleChange}
                                className="w-full h-11 rounded-lg border-2 border-slate-700 bg-slate-800 px-4 text-white"
                            >
                                <option value="TRC20">TRC20 (TRON) - 推奨</option>
                                <option value="ERC20">ERC20 (Ethereum)</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 block mb-2">送金先ウォレットアドレス</label>
                            <Input
                                type="text"
                                name="walletAddress"
                                value={formData.walletAddress}
                                onChange={handleChange}
                                placeholder={formData.network === "TRC20" ? "T..." : "0x..."}
                                required
                                className="bg-slate-800 border-slate-700 text-white font-mono"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                {formData.network === "TRC20"
                                    ? "TRC20アドレス（Tで始まる）を入力してください"
                                    : "ERC20アドレス（0xで始まる）を入力してください"}
                            </p>
                        </div>

                        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <p className="text-sm text-yellow-400">
                                ⚠️ アドレスを間違えると資産が失われます。入力内容を確認してください。
                            </p>
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
                            {isSubmitting ? "処理中..." : "出金申請する"}
                        </Button>
                    </form>

                    <div className="mt-6 p-4 rounded-lg bg-slate-800/50">
                        <h4 className="text-sm font-medium text-white mb-2">ご注意</h4>
                        <ul className="text-xs text-slate-400 space-y-1">
                            <li>• 出金手数料1 USDTが差し引かれます</li>
                            <li>• 処理完了まで1〜24時間かかります</li>
                            <li>• ネットワークを間違えると資産が失われます</li>
                            <li>• ポジション保有中は余剰証拠金の範囲内でのみ出金可能です</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

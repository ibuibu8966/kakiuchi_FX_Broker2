"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function WithdrawPage() {
    const [formData, setFormData] = useState({
        amount: "",
        bankName: "",
        bankBranch: "",
        bankAccountType: "普通",
        bankAccountNumber: "",
        bankAccountName: "",
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

        try {
            const response = await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "WITHDRAWAL",
                    amount: parseFloat(formData.amount),
                    ...formData,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "申請に失敗しました")
            }

            setMessage({ type: "success", text: "出金申請を受け付けました。処理完了まで1〜3営業日お待ちください。" })
            setFormData({
                amount: "",
                bankName: "",
                bankBranch: "",
                bankAccountType: "普通",
                bankAccountNumber: "",
                bankAccountName: "",
            })
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "エラーが発生しました" })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">出金</h1>

            <Card className="bg-slate-900/50 border-slate-800 max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-white">出金申請</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 block mb-2">出金額（円）</label>
                            <Input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                placeholder="10000"
                                min="1000"
                                step="1"
                                required
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                            <p className="text-xs text-slate-500 mt-1">最低出金額: ¥1,000 / 出金手数料: ¥440</p>
                        </div>

                        <div className="pt-4 border-t border-slate-800">
                            <h4 className="text-sm font-medium text-white mb-4">振込先情報</h4>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm text-slate-400 block mb-2">銀行名</label>
                                    <Input
                                        type="text"
                                        name="bankName"
                                        value={formData.bankName}
                                        onChange={handleChange}
                                        placeholder="○○銀行"
                                        required
                                        className="bg-slate-800 border-slate-700 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400 block mb-2">支店名</label>
                                    <Input
                                        type="text"
                                        name="bankBranch"
                                        value={formData.bankBranch}
                                        onChange={handleChange}
                                        placeholder="○○支店"
                                        required
                                        className="bg-slate-800 border-slate-700 text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 mt-4">
                                <div>
                                    <label className="text-sm text-slate-400 block mb-2">口座種別</label>
                                    <select
                                        name="bankAccountType"
                                        value={formData.bankAccountType}
                                        onChange={handleChange}
                                        className="w-full h-11 rounded-lg border-2 border-slate-700 bg-slate-800 px-4 text-white"
                                    >
                                        <option value="普通">普通</option>
                                        <option value="当座">当座</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400 block mb-2">口座番号</label>
                                    <Input
                                        type="text"
                                        name="bankAccountNumber"
                                        value={formData.bankAccountNumber}
                                        onChange={handleChange}
                                        placeholder="1234567"
                                        required
                                        className="bg-slate-800 border-slate-700 text-white"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="text-sm text-slate-400 block mb-2">口座名義（カタカナ）</label>
                                <Input
                                    type="text"
                                    name="bankAccountName"
                                    value={formData.bankAccountName}
                                    onChange={handleChange}
                                    placeholder="ヤマダ タロウ"
                                    required
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
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
                            <li>• 出金手数料440円が差し引かれます</li>
                            <li>• 処理完了まで1〜3営業日かかります</li>
                            <li>• ご登録名義と同一名義の口座のみ指定可能です</li>
                            <li>• ポジション保有中は余剰証拠金の範囲内でのみ出金可能です</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

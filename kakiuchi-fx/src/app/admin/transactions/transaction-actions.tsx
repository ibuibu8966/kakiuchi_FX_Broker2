"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface TransactionActionButtonsProps {
    transactionId: string
    type: string
    accountId: string
    amount: string
    onSuccess?: () => void
}

export function TransactionActionButtons({
    transactionId,
    type,
    accountId,
    amount,
    onSuccess
}: TransactionActionButtonsProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [customAmount, setCustomAmount] = useState("")

    // 元の金額（USDT表示用）
    const originalAmount = (Number(amount) / 100).toFixed(2)

    const handleApprove = async (useCustomAmount: boolean) => {
        setIsLoading(true)
        try {
            const finalAmount = useCustomAmount
                ? (parseFloat(customAmount) * 100).toString()
                : amount

            const response = await fetch(`/api/admin/transactions/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transactionId, type, accountId, amount: finalAmount }),
            })

            if (response.ok) {
                setShowModal(false)
                if (onSuccess) {
                    onSuccess()
                } else {
                    router.refresh()
                }
            }
        } catch (error) {
            console.error("approve error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleReject = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`/api/admin/transactions/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transactionId, type, accountId, amount }),
            })

            if (response.ok) {
                if (onSuccess) {
                    onSuccess()
                } else {
                    router.refresh()
                }
            }
        } catch (error) {
            console.error("reject error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <div className="flex gap-2 justify-center">
                <Button
                    size="sm"
                    onClick={() => setShowModal(true)}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700"
                >
                    承認
                </Button>
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isLoading}
                >
                    却下
                </Button>
            </div>

            {/* 金額確認モーダル */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-white mb-4">
                            {type === "DEPOSIT" ? "入金" : "出金"}承認
                        </h3>

                        <div className="space-y-4">
                            <div className="p-4 bg-slate-800 rounded-lg">
                                <p className="text-sm text-slate-400">申請金額</p>
                                <p className="text-2xl font-bold text-white">{originalAmount} USDT</p>
                            </div>

                            <div className="border-t border-slate-700 pt-4">
                                <p className="text-sm text-slate-400 mb-2">金額を修正する場合はこちらに入力</p>
                                <Input
                                    type="number"
                                    value={customAmount}
                                    onChange={(e) => setCustomAmount(e.target.value)}
                                    placeholder={originalAmount}
                                    step="0.01"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handleApprove(false)}
                                    disabled={isLoading}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                    {isLoading ? "処理中..." : `${originalAmount} USDT で承認`}
                                </Button>
                                {customAmount && (
                                    <Button
                                        onClick={() => handleApprove(true)}
                                        disabled={isLoading}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    >
                                        {isLoading ? "処理中..." : `${customAmount} USDT で承認`}
                                    </Button>
                                )}
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => setShowModal(false)}
                                className="w-full"
                            >
                                キャンセル
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

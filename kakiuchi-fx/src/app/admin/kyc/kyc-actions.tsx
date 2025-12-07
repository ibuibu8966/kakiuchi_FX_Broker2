"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function KycActionButtons({ userId }: { userId: string }) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showRejectForm, setShowRejectForm] = useState(false)
    const [rejectReason, setRejectReason] = useState("")

    const handleApprove = async () => {
        setIsLoading(true)
        try {
            const response = await fetch("/api/admin/kyc/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            })

            if (response.ok) {
                router.refresh()
            }
        } catch (error) {
            console.error("Approve error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleReject = async () => {
        if (!rejectReason.trim()) return

        setIsLoading(true)
        try {
            const response = await fetch("/api/admin/kyc/reject", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, reason: rejectReason }),
            })

            if (response.ok) {
                router.refresh()
            }
        } catch (error) {
            console.error("Reject error:", error)
        } finally {
            setIsLoading(false)
            setShowRejectForm(false)
        }
    }

    if (showRejectForm) {
        return (
            <div className="flex flex-col gap-2 min-w-[200px]">
                <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="却下理由を入力..."
                    className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white text-sm resize-none"
                    rows={3}
                />
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowRejectForm(false)}
                        disabled={isLoading}
                    >
                        キャンセル
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleReject}
                        disabled={isLoading || !rejectReason.trim()}
                    >
                        {isLoading ? "処理中..." : "却下する"}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            <Button
                onClick={handleApprove}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
            >
                {isLoading ? "処理中..." : "承認"}
            </Button>
            <Button
                variant="destructive"
                onClick={() => setShowRejectForm(true)}
                disabled={isLoading}
            >
                却下
            </Button>
        </div>
    )
}

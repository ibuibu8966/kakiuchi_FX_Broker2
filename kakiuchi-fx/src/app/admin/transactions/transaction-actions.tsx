"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface TransactionActionButtonsProps {
    transactionId: string
    type: string
    accountId: string
    amount: string
}

export function TransactionActionButtons({
    transactionId,
    type,
    accountId,
    amount
}: TransactionActionButtonsProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleAction = async (action: "approve" | "reject") => {
        setIsLoading(true)
        try {
            const response = await fetch(`/api/admin/transactions/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transactionId, type, accountId, amount }),
            })

            if (response.ok) {
                router.refresh()
            }
        } catch (error) {
            console.error(`${action} error:`, error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex gap-2 justify-center">
            <Button
                size="sm"
                onClick={() => handleAction("approve")}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
            >
                {isLoading ? "..." : "承認"}
            </Button>
            <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction("reject")}
                disabled={isLoading}
            >
                却下
            </Button>
        </div>
    )
}

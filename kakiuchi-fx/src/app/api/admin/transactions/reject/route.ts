import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "権限がありません" }, { status: 403 })
        }

        const body = await request.json()
        const { transactionId } = body

        if (!transactionId) {
            return NextResponse.json({ error: "取引IDが必要です" }, { status: 400 })
        }

        // ステータス更新
        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: "REJECTED",
                processedAt: new Date(),
                processedBy: session.user.id,
            },
        })

        // 監査ログ
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "TRANSACTION_REJECTED",
                entityType: "Transaction",
                entityId: transactionId,
                newValue: { rejectedBy: session.user.id },
            },
        })

        return NextResponse.json({ message: "却下しました" })
    } catch (error) {
        console.error("Transaction reject error:", error)
        return NextResponse.json(
            { error: "却下処理に失敗しました" },
            { status: 500 }
        )
    }
}

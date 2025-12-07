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
        const { transactionId, type, accountId, amount } = body

        if (!transactionId) {
            return NextResponse.json({ error: "取引IDが必要です" }, { status: 400 })
        }

        // トランザクション更新
        await prisma.$transaction(async (tx) => {
            // ステータス更新
            await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status: "COMPLETED",
                    processedAt: new Date(),
                    processedBy: session.user.id,
                },
            })

            // 入金の場合は残高を増やす
            if (type === "DEPOSIT") {
                await tx.account.update({
                    where: { id: accountId },
                    data: {
                        balance: { increment: BigInt(amount) },
                        equity: { increment: BigInt(amount) },
                    },
                })
            }
            // 出金の場合は残高を減らす
            else if (type === "WITHDRAWAL") {
                await tx.account.update({
                    where: { id: accountId },
                    data: {
                        balance: { decrement: BigInt(amount) },
                        equity: { decrement: BigInt(amount) },
                    },
                })
            }
        })

        // 監査ログ
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: type === "DEPOSIT" ? "DEPOSIT_APPROVED" : "WITHDRAWAL_APPROVED",
                entityType: "Transaction",
                entityId: transactionId,
                newValue: { approvedBy: session.user.id },
            },
        })

        return NextResponse.json({ message: "承認しました" })
    } catch (error) {
        console.error("Transaction approve error:", error)
        return NextResponse.json(
            { error: "承認処理に失敗しました" },
            { status: 500 }
        )
    }
}

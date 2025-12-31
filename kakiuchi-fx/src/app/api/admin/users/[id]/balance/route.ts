import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "権限がありません" }, { status: 403 })
        }

        const { id: userId } = await params
        const body = await request.json()
        const { amount, type } = body

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "金額を正しく入力してください" }, { status: 400 })
        }

        if (!["DEPOSIT", "WITHDRAWAL"].includes(type)) {
            return NextResponse.json({ error: "取引タイプが無効です" }, { status: 400 })
        }

        // ユーザーの口座を取得
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { accounts: true },
        })

        if (!user || user.accounts.length === 0) {
            return NextResponse.json({ error: "口座が見つかりません" }, { status: 404 })
        }

        const account = user.accounts[0]
        const amountInCents = BigInt(Math.round(amount * 100))

        // 出金の場合、残高チェック
        if (type === "WITHDRAWAL") {
            if (account.balance < amountInCents) {
                return NextResponse.json({ error: "残高が不足しています" }, { status: 400 })
            }
        }

        // トランザクション実行
        await prisma.$transaction([
            // 残高更新
            prisma.account.update({
                where: { id: account.id },
                data: {
                    balance: type === "DEPOSIT"
                        ? { increment: amountInCents }
                        : { decrement: amountInCents },
                },
            }),
            // 取引履歴作成（管理者による直接操作として記録）
            prisma.transaction.create({
                data: {
                    accountId: account.id,
                    type: type,
                    amount: amountInCents,
                    status: "COMPLETED",
                    processedBy: session.user.id,
                    processedAt: new Date(),
                    note: `管理者による直接${type === "DEPOSIT" ? "入金" : "出金"}`,
                },
            }),
            // 監査ログ
            prisma.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: `ADMIN_${type}`,
                    entityType: "Account",
                    entityId: account.id,
                    newValue: {
                        targetUserId: userId,
                        amount: amount,
                        type: type,
                    },
                },
            }),
        ])

        return NextResponse.json({
            message: `${type === "DEPOSIT" ? "入金" : "出金"}が完了しました`,
            amount: amount,
        })
    } catch (error) {
        console.error("Balance adjustment error:", error)
        return NextResponse.json(
            { error: "残高調整に失敗しました" },
            { status: 500 }
        )
    }
}

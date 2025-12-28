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
        const { userId, type, amount, note } = body

        // バリデーション
        if (!userId || !type || !amount) {
            return NextResponse.json(
                { error: "必須項目が不足しています" },
                { status: 400 }
            )
        }

        if (type !== "DEPOSIT" && type !== "WITHDRAWAL") {
            return NextResponse.json(
                { error: "無効な取引種別です" },
                { status: 400 }
            )
        }

        const parsedAmount = parseFloat(amount)
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json(
                { error: "有効な金額を入力してください" },
                { status: 400 }
            )
        }

        // ユーザーの口座を取得
        const account = await prisma.account.findFirst({
            where: { userId },
        })

        if (!account) {
            return NextResponse.json(
                { error: "ユーザーの口座が見つかりません" },
                { status: 404 }
            )
        }

        // 金額をセント単位に変換（BigInt）
        const amountInCents = BigInt(Math.round(parsedAmount * 100))

        // 出金の場合、残高チェック
        if (type === "WITHDRAWAL" && account.balance < amountInCents) {
            return NextResponse.json(
                { error: "残高が不足しています" },
                { status: 400 }
            )
        }

        // トランザクションで入出金処理
        const result = await prisma.$transaction(async (tx) => {
            // Transactionレコード作成（即座に完了状態）
            const transaction = await tx.transaction.create({
                data: {
                    accountId: account.id,
                    type,
                    amount: amountInCents,
                    status: "COMPLETED",
                    note: note || `管理者による${type === "DEPOSIT" ? "入金" : "出金"}`,
                    processedAt: new Date(),
                },
            })

            // 残高更新
            const newBalance = type === "DEPOSIT"
                ? account.balance + amountInCents
                : account.balance - amountInCents

            const newEquity = type === "DEPOSIT"
                ? account.equity + amountInCents
                : account.equity - amountInCents

            await tx.account.update({
                where: { id: account.id },
                data: {
                    balance: newBalance,
                    equity: newEquity,
                },
            })

            return { transaction, newBalance }
        })

        return NextResponse.json({
            success: true,
            transaction: {
                id: result.transaction.id,
                type: result.transaction.type,
                amount: Number(result.transaction.amount) / 100,
                status: result.transaction.status,
                createdAt: result.transaction.createdAt.toISOString(),
            },
            newBalance: Number(result.newBalance) / 100,
        })
    } catch (error) {
        console.error("Create transaction error:", error)
        return NextResponse.json(
            { error: "入出金処理に失敗しました" },
            { status: 500 }
        )
    }
}

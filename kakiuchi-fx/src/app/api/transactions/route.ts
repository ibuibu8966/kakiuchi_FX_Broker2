import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { amountToBigInt } from "@/lib/utils/bigint"

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const body = await request.json()
        const { type, amount, bankName, bankBranch, bankAccountType, bankAccountNumber, bankAccountName } = body

        if (!type || !amount) {
            return NextResponse.json(
                { error: "必須項目が不足しています" },
                { status: 400 }
            )
        }

        if (!["DEPOSIT", "WITHDRAWAL"].includes(type)) {
            return NextResponse.json({ error: "無効な取引タイプです" }, { status: 400 })
        }

        if (amount < 1000) {
            return NextResponse.json(
                { error: "最低金額は1,000円です" },
                { status: 400 }
            )
        }

        // 口座取得
        const account = await prisma.account.findFirst({
            where: { userId: session.user.id },
        })

        if (!account) {
            return NextResponse.json({ error: "口座がありません" }, { status: 400 })
        }

        // 出金の場合は残高チェック
        if (type === "WITHDRAWAL") {
            const amountBigInt = amountToBigInt(amount)
            const freeMargin = account.balance - account.usedMargin

            if (amountBigInt > freeMargin) {
                return NextResponse.json(
                    { error: "出金可能額を超えています" },
                    { status: 400 }
                )
            }
        }

        // 取引申請作成
        const transaction = await prisma.transaction.create({
            data: {
                accountId: account.id,
                type,
                amount: amountToBigInt(amount),
                bankName: bankName || null,
                bankBranch: bankBranch || null,
                bankAccountType: bankAccountType || null,
                bankAccountNumber: bankAccountNumber || null,
                bankAccountName: bankAccountName || null,
                status: "PENDING",
            },
        })

        // 監査ログ
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: type === "DEPOSIT" ? "DEPOSIT_REQUESTED" : "WITHDRAWAL_REQUESTED",
                entityType: "Transaction",
                entityId: transaction.id,
                newValue: { type, amount },
            },
        })

        return NextResponse.json({
            message: type === "DEPOSIT" ? "入金申請を受け付けました" : "出金申請を受け付けました",
            transactionId: transaction.id,
        })
    } catch (error) {
        console.error("Transaction error:", error)
        return NextResponse.json(
            { error: "申請処理中にエラーが発生しました" },
            { status: 500 }
        )
    }
}

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const account = await prisma.account.findFirst({
            where: { userId: session.user.id },
        })

        if (!account) {
            return NextResponse.json({ error: "口座がありません" }, { status: 404 })
        }

        const transactions = await prisma.transaction.findMany({
            where: { accountId: account.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        })

        // BigIntをstringに変換
        const serialized = transactions.map((t) => ({
            ...t,
            amount: t.amount.toString(),
        }))

        return NextResponse.json({ transactions: serialized })
    } catch (error) {
        console.error("Get transactions error:", error)
        return NextResponse.json(
            { error: "取引履歴の取得に失敗しました" },
            { status: 500 }
        )
    }
}

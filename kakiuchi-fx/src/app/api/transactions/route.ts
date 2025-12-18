import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { amountToBigInt } from "@/lib/utils/bigint"

// 会社のUSDTウォレットアドレス
const COMPANY_WALLET_ADDRESS = "TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const body = await request.json()
        const { type, amount, walletAddress, network, depositAddress } = body

        if (!type || !amount) {
            return NextResponse.json(
                { error: "必須項目が不足しています" },
                { status: 400 }
            )
        }

        if (!["DEPOSIT", "WITHDRAWAL"].includes(type)) {
            return NextResponse.json({ error: "無効な取引タイプです" }, { status: 400 })
        }

        if (amount < 10) {
            return NextResponse.json(
                { error: "最低金額は10 USDTです" },
                { status: 400 }
            )
        }

        // 口座取得（ポジションも含めて含み損益を計算）
        const account = await prisma.account.findFirst({
            where: { userId: session.user.id },
            include: {
                positions: {
                    where: { status: "OPEN" },
                },
            },
        })

        if (!account) {
            return NextResponse.json({ error: "口座がありません" }, { status: 400 })
        }

        // 出金の場合は余剰証拠金チェック（含み損益を考慮）
        if (type === "WITHDRAWAL") {
            if (!walletAddress) {
                return NextResponse.json({ error: "ウォレットアドレスが必要です" }, { status: 400 })
            }

            const amountBigInt = amountToBigInt(amount)

            // 有効証拠金 = 残高 + 含み損益
            // 含み損益はポジションのrealizedPnlがnullの場合、現在価格から計算が必要
            // 簡易的にはDBに保存されているequityを使用
            const equity = account.equity
            const usedMargin = account.usedMargin

            // 余剰証拠金 = 有効証拠金 - 使用証拠金
            const freeMargin = equity - usedMargin

            if (amountBigInt > freeMargin) {
                // freeMarginは×100の日本円表記なので、USDTに換算（仮レート: 1 USDT = 150円）
                const freeMarginUsdt = (Number(freeMargin) / 100 / 150).toFixed(2)
                return NextResponse.json(
                    { error: `出金可能額を超えています。現在の出金可能額: 約${freeMarginUsdt} USDT` },
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
                network: network || "TRC20",
                walletAddress: walletAddress || null,
                depositAddress: type === "DEPOSIT" ? (depositAddress || COMPANY_WALLET_ADDRESS) : null,
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
                newValue: { type, amount, network, walletAddress },
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

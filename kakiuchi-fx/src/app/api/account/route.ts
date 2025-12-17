import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentPrice } from "@/lib/fix-client"
import { priceToBigInt, calculateUnrealizedPnl } from "@/lib/utils/bigint"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const account = await prisma.account.findFirst({
            where: { userId: session.user.id },
            include: {
                positions: {
                    where: { status: "OPEN" },
                },
            },
        })

        if (!account) {
            return NextResponse.json({ error: "口座がありません" }, { status: 404 })
        }

        const balance = Number(account.balance) / 10000
        const usedMargin = Number(account.usedMargin) / 10000

        // 含み損益をリアルタイム計算
        let unrealizedPnl = 0
        const price = getCurrentPrice()
        if (price && account.positions.length > 0) {
            const bidBigInt = priceToBigInt(price.bid)
            const askBigInt = priceToBigInt(price.ask)

            for (const pos of account.positions) {
                const currentPriceBigInt = pos.side === "BUY" ? bidBigInt : askBigInt
                const pnl = calculateUnrealizedPnl(
                    pos.side as "BUY" | "SELL",
                    pos.quantity,
                    pos.entryPrice,
                    currentPriceBigInt
                )
                unrealizedPnl += Number(pnl) / 10000
            }
        }

        // equity = balance + 含み損益
        const equity = balance + unrealizedPnl
        const freeMargin = equity - usedMargin
        const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 0

        return NextResponse.json({
            balance,
            equity,
            usedMargin,
            freeMargin,
            marginLevel,
            leverage: account.leverage,
        })
    } catch (error) {
        console.error("Get account error:", error)
        return NextResponse.json(
            { error: "口座情報の取得に失敗しました" },
            { status: 500 }
        )
    }
}

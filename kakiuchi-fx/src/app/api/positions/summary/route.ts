import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
                    orderBy: { openedAt: "desc" },
                },
                orders: {
                    where: { status: "PENDING" },
                    orderBy: { createdAt: "desc" },
                },
            },
        })

        if (!account) {
            return NextResponse.json({ positions: [], pendingOrders: [], closedPositions: [] })
        }

        // オープンポジションをシリアライズ
        const openPositions = account.positions.filter(p => p.status === "OPEN")
        const positions = openPositions.map(p => ({
            id: p.id,
            symbol: p.symbol,
            side: p.side,
            quantity: Number(p.quantity) / 1000, // ロット変換
            entryPrice: Number(p.entryPrice) / 10000, // 価格変換
            stopLoss: p.stopLoss ? Number(p.stopLoss) / 10000 : null,
            takeProfit: p.takeProfit ? Number(p.takeProfit) / 10000 : null,
            margin: Number(p.margin) / 10000,
        }))

        // 待機注文をシリアライズ
        const pendingOrders = account.orders.map(o => ({
            id: o.id,
            symbol: o.symbol,
            side: o.side,
            orderType: o.orderType,
            quantity: Number(o.quantity) / 1000,
            price: o.price ? Number(o.price) / 10000 : 0,
        }))

        // 決済済みポジションをシリアライズ（エントリーから決済までを1行で表示）
        const closedPositionsRaw = account.positions.filter(p => p.status === "CLOSED")
        const closedPositions = closedPositionsRaw.slice(0, 50).map(p => ({
            id: p.id,
            symbol: p.symbol,
            side: p.side,
            quantity: Number(p.quantity) / 1000,
            entryPrice: Number(p.entryPrice) / 10000,
            closePrice: p.closePrice ? Number(p.closePrice) / 10000 : null,
            pnl: p.realizedPnl ? Number(p.realizedPnl) / 100 : null,
            openedAt: p.openedAt.toISOString(),
            closedAt: p.closedAt?.toISOString() || null,
        }))

        return NextResponse.json({ positions, pendingOrders, closedPositions })
    } catch (error) {
        console.error("Get positions summary error:", error)
        return NextResponse.json(
            { error: "ポジション情報の取得に失敗しました" },
            { status: 500 }
        )
    }
}

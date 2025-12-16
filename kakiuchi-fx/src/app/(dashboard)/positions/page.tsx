import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PositionTable } from "./position-table"
import { PendingOrdersTable } from "./pending-orders-table"

// モック価格（本番ではPusherから取得）
function getMockPrice() {
    const basePrice = 188.500
    const variation = (Math.random() - 0.5) * 0.1
    const bid = basePrice + variation
    const spread = 0.02
    return {
        bid: Math.round((bid) * 10000) / 10000,
        ask: Math.round((bid + spread) * 10000) / 10000,
    }
}

export default async function PositionsPage() {
    const session = await auth()

    const account = await prisma.account.findFirst({
        where: { userId: session?.user?.id },
        include: {
            positions: {
                where: { status: "OPEN" },
                orderBy: { openedAt: "desc" },
            },
            orders: {
                where: { status: "PENDING" },
                orderBy: { createdAt: "desc" },
            },
        },
    })

    const positions = account?.positions || []
    const pendingOrders = account?.orders || []
    const currentPrice = getMockPrice()

    // BigIntをシリアライズ可能な形式に変換
    const serializedPositions = positions.map(p => ({
        id: p.id,
        symbol: p.symbol,
        side: p.side as "BUY" | "SELL",
        quantity: p.quantity,
        entryPrice: p.entryPrice,
        stopLoss: p.stopLoss,
        takeProfit: p.takeProfit,
        margin: p.margin,
        openedAt: p.openedAt,
    }))

    const serializedOrders = pendingOrders.map(o => ({
        id: o.id,
        symbol: o.symbol,
        side: o.side as "BUY" | "SELL",
        orderType: o.orderType as "LIMIT" | "STOP",
        quantity: o.quantity,
        price: o.price,
        stopLoss: o.stopLoss,
        takeProfit: o.takeProfit,
        createdAt: o.createdAt,
    }))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">ポジション</h1>
                <span className="text-slate-400">
                    保有中: {positions.length} ポジション / 待機中: {pendingOrders.length} 注文
                </span>
            </div>

            {/* 保有ポジション */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white">保有ポジション</CardTitle>
                </CardHeader>
                <CardContent>
                    <PositionTable
                        positions={serializedPositions}
                        currentBid={currentPrice.bid}
                        currentAsk={currentPrice.ask}
                    />
                </CardContent>
            </Card>

            {/* 待機中の注文 */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white">待機中の注文（指値・逆指値）</CardTitle>
                </CardHeader>
                <CardContent>
                    <PendingOrdersTable orders={serializedOrders} />
                </CardContent>
            </Card>
        </div>
    )
}

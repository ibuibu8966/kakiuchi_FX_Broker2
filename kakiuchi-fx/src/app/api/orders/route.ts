import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { lotToBigInt, priceToBigInt, calculateRequiredMargin } from "@/lib/utils/bigint"

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

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        // KYCチェック
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        })

        if (user?.kycStatus !== "VERIFIED") {
            return NextResponse.json(
                { error: "取引を行うにはKYC認証が必要です" },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { side, orderType, quantity, price, stopLoss, takeProfit } = body

        // バリデーション
        if (!side || !orderType || !quantity) {
            return NextResponse.json(
                { error: "必須項目が不足しています" },
                { status: 400 }
            )
        }

        if (!["BUY", "SELL"].includes(side)) {
            return NextResponse.json({ error: "無効な売買方向です" }, { status: 400 })
        }

        if (!["MARKET", "LIMIT", "STOP"].includes(orderType)) {
            return NextResponse.json({ error: "無効な注文タイプです" }, { status: 400 })
        }

        if (quantity < 0.01 || quantity > 100) {
            return NextResponse.json(
                { error: "ロット数は0.01〜100の範囲で指定してください" },
                { status: 400 }
            )
        }

        // 口座取得
        const account = await prisma.account.findFirst({
            where: { userId: session.user.id, status: "ACTIVE" },
        })

        if (!account) {
            return NextResponse.json(
                { error: "有効な口座がありません" },
                { status: 400 }
            )
        }

        // 現在価格を取得（モック）
        const currentPrice = getMockPrice()
        const executionPrice = side === "BUY" ? currentPrice.ask : currentPrice.bid

        // BigInt変換
        const quantityBigInt = lotToBigInt(quantity)
        const executionPriceBigInt = priceToBigInt(executionPrice)
        const stopLossBigInt = stopLoss ? priceToBigInt(stopLoss) : null
        const takeProfitBigInt = takeProfit ? priceToBigInt(takeProfit) : null

        // 必要証拠金計算
        const requiredMargin = calculateRequiredMargin(
            quantityBigInt,
            executionPriceBigInt,
            account.leverage
        )

        // 余剰証拠金チェック
        const freeMargin = account.balance - account.usedMargin
        if (freeMargin < requiredMargin) {
            return NextResponse.json(
                { error: "証拠金が不足しています" },
                { status: 400 }
            )
        }

        // 成行注文の場合は即時約定
        if (orderType === "MARKET") {
            // トランザクションで注文・ポジション・取引を作成
            const result = await prisma.$transaction(async (tx) => {
                // ポジション作成
                const position = await tx.position.create({
                    data: {
                        accountId: account.id,
                        symbol: "GBPJPY",
                        side,
                        quantity: quantityBigInt,
                        entryPrice: executionPriceBigInt,
                        stopLoss: stopLossBigInt,
                        takeProfit: takeProfitBigInt,
                        margin: requiredMargin,
                        status: "OPEN",
                    },
                })

                // 注文作成
                const order = await tx.order.create({
                    data: {
                        accountId: account.id,
                        symbol: "GBPJPY",
                        side,
                        orderType: "MARKET",
                        quantity: quantityBigInt,
                        status: "FILLED",
                        filledQuantity: quantityBigInt,
                        filledPrice: executionPriceBigInt,
                        filledAt: new Date(),
                        positionId: position.id,
                        stopLoss: stopLossBigInt,
                        takeProfit: takeProfitBigInt,
                    },
                })

                // 取引記録作成
                await tx.trade.create({
                    data: {
                        accountId: account.id,
                        orderId: order.id,
                        positionId: position.id,
                        symbol: "GBPJPY",
                        side,
                        tradeType: "OPEN",
                        quantity: quantityBigInt,
                        price: executionPriceBigInt,
                        commission: 0n, // 手数料は別途設定から取得
                    },
                })

                // 口座の証拠金を更新
                await tx.account.update({
                    where: { id: account.id },
                    data: {
                        usedMargin: { increment: requiredMargin },
                    },
                })

                // 監査ログ
                await tx.auditLog.create({
                    data: {
                        userId: session.user.id,
                        action: "ORDER_EXECUTED",
                        entityType: "Order",
                        entityId: order.id,
                        newValue: {
                            side,
                            quantity: quantity.toString(),
                            price: executionPrice.toString(),
                        },
                    },
                })

                return { order, position }
            })

            return NextResponse.json({
                message: "注文が約定しました",
                orderId: result.order.id,
                positionId: result.position.id,
                executionPrice,
            })
        }

        // 指値/逆指値注文（保留）
        const order = await prisma.order.create({
            data: {
                accountId: account.id,
                symbol: "GBPJPY",
                side,
                orderType,
                quantity: quantityBigInt,
                price: price ? priceToBigInt(price) : null,
                stopLoss: stopLossBigInt,
                takeProfit: takeProfitBigInt,
                status: "PENDING",
            },
        })

        return NextResponse.json({
            message: "注文を受け付けました",
            orderId: order.id,
        })
    } catch (error) {
        console.error("Order error:", error)
        return NextResponse.json(
            { error: "注文処理中にエラーが発生しました" },
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

        const orders = await prisma.order.findMany({
            where: { accountId: account.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        })

        // BigIntをstringに変換
        const serializedOrders = orders.map((order) => ({
            ...order,
            quantity: order.quantity.toString(),
            price: order.price?.toString() || null,
            stopPrice: order.stopPrice?.toString() || null,
            filledQuantity: order.filledQuantity.toString(),
            filledPrice: order.filledPrice?.toString() || null,
            stopLoss: order.stopLoss?.toString() || null,
            takeProfit: order.takeProfit?.toString() || null,
        }))

        return NextResponse.json({ orders: serializedOrders })
    } catch (error) {
        console.error("Get orders error:", error)
        return NextResponse.json(
            { error: "注文一覧の取得に失敗しました" },
            { status: 500 }
        )
    }
}

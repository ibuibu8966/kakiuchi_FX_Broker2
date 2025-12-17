import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { priceToBigInt, bigIntToAmount, calculateUnrealizedPnl } from "@/lib/utils/bigint"
import { getCurrentPrice } from "@/lib/fix-client"

// リアルタイム価格を取得
function getExecutionPrice() {
    const price = getCurrentPrice()
    if (price) {
        return {
            bid: price.bid,
            ask: price.ask,
        }
    }
    return null
}

// PUT: SL/TP更新
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { stopLoss, takeProfit } = body

        // ポジション取得と所有者確認
        const position = await prisma.position.findUnique({
            where: { id },
            include: {
                account: {
                    select: { userId: true }
                }
            }
        })

        if (!position) {
            return NextResponse.json({ error: "ポジションが見つかりません" }, { status: 404 })
        }

        if (position.account.userId !== session.user.id) {
            return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 })
        }

        if (position.status !== "OPEN") {
            return NextResponse.json({ error: "このポジションは既に決済されています" }, { status: 400 })
        }

        // SL/TPのバリデーション（BUYの場合：SL < エントリー < TP、SELLの場合：TP < エントリー < SL）
        const entryPrice = Number(position.entryPrice) / 10000

        if (stopLoss !== null && stopLoss !== undefined) {
            if (position.side === "BUY" && stopLoss >= entryPrice) {
                return NextResponse.json({ error: "買いポジションのSLはエントリー価格より低く設定してください" }, { status: 400 })
            }
            if (position.side === "SELL" && stopLoss <= entryPrice) {
                return NextResponse.json({ error: "売りポジションのSLはエントリー価格より高く設定してください" }, { status: 400 })
            }
        }

        if (takeProfit !== null && takeProfit !== undefined) {
            if (position.side === "BUY" && takeProfit <= entryPrice) {
                return NextResponse.json({ error: "買いポジションのTPはエントリー価格より高く設定してください" }, { status: 400 })
            }
            if (position.side === "SELL" && takeProfit >= entryPrice) {
                return NextResponse.json({ error: "売りポジションのTPはエントリー価格より低く設定してください" }, { status: 400 })
            }
        }

        // 更新
        const updatedPosition = await prisma.position.update({
            where: { id },
            data: {
                stopLoss: stopLoss !== null && stopLoss !== undefined ? priceToBigInt(stopLoss) : null,
                takeProfit: takeProfit !== null && takeProfit !== undefined ? priceToBigInt(takeProfit) : null,
            }
        })

        // 監査ログ
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "POSITION_SL_TP_UPDATED",
                entityType: "Position",
                entityId: id,
                newValue: { stopLoss, takeProfit },
            }
        })

        return NextResponse.json({
            message: "SL/TPを更新しました",
            position: {
                id: updatedPosition.id,
                stopLoss: updatedPosition.stopLoss?.toString() || null,
                takeProfit: updatedPosition.takeProfit?.toString() || null,
            }
        })
    } catch (error) {
        console.error("Position update error:", error)
        return NextResponse.json(
            { error: "ポジション更新中にエラーが発生しました" },
            { status: 500 }
        )
    }
}

// DELETE: ポジション決済
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const { id } = await params

        // ポジション取得
        const position = await prisma.position.findUnique({
            where: { id },
            include: {
                account: {
                    select: { id: true, userId: true, balance: true }
                }
            }
        })

        if (!position) {
            return NextResponse.json({ error: "ポジションが見つかりません" }, { status: 404 })
        }

        if (position.account.userId !== session.user.id) {
            return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 })
        }

        if (position.status !== "OPEN") {
            return NextResponse.json({ error: "このポジションは既に決済されています" }, { status: 400 })
        }

        // 現在価格を取得（リアルタイム）
        const currentPrice = getExecutionPrice()
        if (!currentPrice) {
            return NextResponse.json(
                { error: "現在サーバーメンテナンス中です。しばらくお待ちください。" },
                { status: 503 }
            )
        }
        // BUYポジションはBidで決済、SELLポジションはAskで決済
        const closePrice = position.side === "BUY" ? currentPrice.bid : currentPrice.ask
        const closePriceBigInt = priceToBigInt(closePrice)

        // 損益計算
        const pnl = calculateUnrealizedPnl(
            position.side as "BUY" | "SELL",
            position.quantity,
            position.entryPrice,
            closePriceBigInt
        )

        // トランザクションで決済処理
        const result = await prisma.$transaction(async (tx) => {
            // ポジションをクローズ
            const closedPosition = await tx.position.update({
                where: { id },
                data: {
                    status: "CLOSED",
                    closePrice: closePriceBigInt,
                    realizedPnl: pnl,
                    closedAt: new Date(),
                }
            })

            // 決済注文を作成
            const closeOrder = await tx.order.create({
                data: {
                    accountId: position.account.id,
                    symbol: position.symbol,
                    side: position.side === "BUY" ? "SELL" : "BUY", // 反対売買
                    orderType: "MARKET",
                    quantity: position.quantity,
                    status: "FILLED",
                    filledQuantity: position.quantity,
                    filledPrice: closePriceBigInt,
                    filledAt: new Date(),
                    positionId: position.id,
                }
            })

            // 取引記録作成
            await tx.trade.create({
                data: {
                    accountId: position.account.id,
                    orderId: closeOrder.id,
                    positionId: position.id,
                    symbol: position.symbol,
                    side: position.side === "BUY" ? "SELL" : "BUY",
                    tradeType: "CLOSE",
                    quantity: position.quantity,
                    price: closePriceBigInt,
                    pnl: pnl,
                }
            })

            // 口座残高更新（証拠金解放 + 損益反映）
            await tx.account.update({
                where: { id: position.account.id },
                data: {
                    balance: { increment: pnl },
                    usedMargin: { decrement: position.margin },
                }
            })

            // 監査ログ
            await tx.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: "POSITION_CLOSED",
                    entityType: "Position",
                    entityId: id,
                    newValue: {
                        closePrice: closePrice.toString(),
                        pnl: bigIntToAmount(pnl).toString(),
                    },
                }
            })

            return { closedPosition, closeOrder, pnl }
        })

        return NextResponse.json({
            message: "ポジションを決済しました",
            closePrice,
            pnl: bigIntToAmount(result.pnl),
        })
    } catch (error) {
        console.error("Position close error:", error)
        return NextResponse.json(
            { error: "ポジション決済中にエラーが発生しました" },
            { status: 500 }
        )
    }
}

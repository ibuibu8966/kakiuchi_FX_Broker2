/**
 * Order Execution Service
 * Checks and executes pending limit/stop orders and TP/SL on price updates
 */

import { prisma } from "./prisma"
import { getUsdJpyRate } from "./fix-client"
import { calculateRequiredMargin, calculateUnrealizedPnl, priceToBigInt, bigIntToAmount } from "./utils/bigint"

// 処理中フラグ
let isProcessing = false

/**
 * 価格更新時に注文・TP/SLをチェック
 */
export async function onPriceUpdateOrders(currentPrice: { bid: number; ask: number }) {
    if (isProcessing) return
    isProcessing = true

    try {
        await Promise.all([
            checkPendingOrders(currentPrice),
            checkTakeProfitStopLoss(currentPrice),
        ])
    } catch (error) {
        console.error("Order execution error:", error)
    } finally {
        isProcessing = false
    }
}

/**
 * 保留中の指値・逆指値注文をチェック
 */
async function checkPendingOrders(currentPrice: { bid: number; ask: number }) {
    const pendingOrders = await prisma.order.findMany({
        where: { status: "PENDING" },
        include: {
            account: {
                select: { id: true, userId: true, balance: true, usedMargin: true, leverage: true },
            },
        },
    })

    for (const order of pendingOrders) {
        const shouldExecute = checkOrderCondition(order, currentPrice)
        if (shouldExecute) {
            await executeOrder(order, currentPrice)
        }
    }
}

/**
 * 注文条件をチェック
 */
function checkOrderCondition(
    order: { side: string; orderType: string; price: bigint | null },
    currentPrice: { bid: number; ask: number }
): boolean {
    if (!order.price) return false
    const orderPrice = Number(order.price) / 10000

    if (order.orderType === "LIMIT") {
        // 指値: BUY→Ask≤指定価格、SELL→Bid≥指定価格
        if (order.side === "BUY" && currentPrice.ask <= orderPrice) return true
        if (order.side === "SELL" && currentPrice.bid >= orderPrice) return true
    } else if (order.orderType === "STOP") {
        // 逆指値: BUY→Ask≥指定価格、SELL→Bid≤指定価格
        if (order.side === "BUY" && currentPrice.ask >= orderPrice) return true
        if (order.side === "SELL" && currentPrice.bid <= orderPrice) return true
    }

    return false
}

/**
 * 注文を約定
 */
async function executeOrder(
    order: {
        id: string
        accountId: string
        symbol: string
        side: string
        quantity: bigint
        stopLoss: bigint | null
        takeProfit: bigint | null
        account: { id: string; userId: string; balance: bigint; usedMargin: bigint; leverage: number }
    },
    currentPrice: { bid: number; ask: number }
) {
    try {
        const executionPrice = order.side === "BUY" ? currentPrice.ask : currentPrice.bid
        const executionPriceBigInt = priceToBigInt(executionPrice)
        const usdJpyRate = getUsdJpyRate()

        // 必要証拠金計算（USD換算）
        const requiredMarginJpy = calculateRequiredMargin(
            order.quantity,
            executionPriceBigInt,
            order.account.leverage
        )
        const requiredMarginUsd = BigInt(Math.round(Number(requiredMarginJpy) / usdJpyRate))

        // 証拠金チェック
        const freeMargin = order.account.balance - order.account.usedMargin
        if (freeMargin < requiredMarginUsd) {
            // 証拠金不足でキャンセル
            await prisma.order.update({
                where: { id: order.id },
                data: { status: "CANCELLED" },
            })
            console.log(`Order ${order.id}: Cancelled due to insufficient margin`)
            return
        }

        await prisma.$transaction(async (tx) => {
            // ポジション作成
            const position = await tx.position.create({
                data: {
                    accountId: order.accountId,
                    symbol: order.symbol,
                    side: order.side as "BUY" | "SELL",
                    quantity: order.quantity,
                    entryPrice: executionPriceBigInt,
                    stopLoss: order.stopLoss,
                    takeProfit: order.takeProfit,
                    margin: requiredMarginUsd,
                    status: "OPEN",
                    entryUsdJpyRate: usdJpyRate,
                },
            })

            // 注文をFILLEDに更新
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: "FILLED",
                    filledQuantity: order.quantity,
                    filledPrice: executionPriceBigInt,
                    filledAt: new Date(),
                    positionId: position.id,
                },
            })

            // 取引記録
            await tx.trade.create({
                data: {
                    accountId: order.accountId,
                    orderId: order.id,
                    positionId: position.id,
                    symbol: order.symbol,
                    side: order.side as "BUY" | "SELL",
                    tradeType: "OPEN",
                    quantity: order.quantity,
                    price: executionPriceBigInt,
                },
            })

            // 証拠金更新
            await tx.account.update({
                where: { id: order.accountId },
                data: {
                    usedMargin: { increment: requiredMarginUsd },
                },
            })
        })

        console.log(`Order ${order.id}: Executed at ${executionPrice}`)
    } catch (error) {
        console.error(`Order ${order.id} execution error:`, error)
    }
}

/**
 * オープンポジションのTP/SLをチェック
 */
async function checkTakeProfitStopLoss(currentPrice: { bid: number; ask: number }) {
    const positions = await prisma.position.findMany({
        where: {
            status: "OPEN",
            OR: [
                { takeProfit: { not: null } },
                { stopLoss: { not: null } },
            ],
        },
        include: {
            account: {
                select: { id: true, userId: true },
            },
        },
    })

    for (const position of positions) {
        const closePrice = position.side === "BUY" ? currentPrice.bid : currentPrice.ask
        const closePriceBigInt = priceToBigInt(closePrice)
        let shouldClose = false
        let closeReason = ""

        // TP/SLチェック
        if (position.takeProfit) {
            const tp = Number(position.takeProfit) / 10000
            if (position.side === "BUY" && closePrice >= tp) {
                shouldClose = true
                closeReason = "TP"
            } else if (position.side === "SELL" && closePrice <= tp) {
                shouldClose = true
                closeReason = "TP"
            }
        }

        if (!shouldClose && position.stopLoss) {
            const sl = Number(position.stopLoss) / 10000
            if (position.side === "BUY" && closePrice <= sl) {
                shouldClose = true
                closeReason = "SL"
            } else if (position.side === "SELL" && closePrice >= sl) {
                shouldClose = true
                closeReason = "SL"
            }
        }

        if (shouldClose) {
            await closePositionByTPSL(position, closePriceBigInt, closeReason)
        }
    }
}

/**
 * TP/SLでポジションをクローズ
 */
async function closePositionByTPSL(
    position: {
        id: string
        accountId: string
        symbol: string
        side: string
        quantity: bigint
        entryPrice: bigint
        margin: bigint
        account: { id: string; userId: string }
    },
    closePriceBigInt: bigint,
    closeReason: string
) {
    try {
        const usdJpyRate = getUsdJpyRate()

        // 損益計算
        const pnlJpy = calculateUnrealizedPnl(
            position.side as "BUY" | "SELL",
            position.quantity,
            position.entryPrice,
            closePriceBigInt
        )
        const pnlUsd = BigInt(Math.round(Number(pnlJpy) / usdJpyRate))

        await prisma.$transaction(async (tx) => {
            // ポジションクローズ
            await tx.position.update({
                where: { id: position.id },
                data: {
                    status: "CLOSED",
                    closePrice: closePriceBigInt,
                    realizedPnl: pnlJpy,
                    closeUsdJpyRate: usdJpyRate,
                    realizedPnlUsdt: bigIntToAmount(pnlJpy) / usdJpyRate,
                    closedAt: new Date(),
                },
            })

            // 取引記録
            await tx.trade.create({
                data: {
                    accountId: position.accountId,
                    positionId: position.id,
                    symbol: position.symbol,
                    side: position.side === "BUY" ? "SELL" : "BUY",
                    tradeType: "CLOSE",
                    quantity: position.quantity,
                    price: closePriceBigInt,
                    pnl: pnlJpy,
                },
            })

            // 口座更新
            await tx.account.update({
                where: { id: position.accountId },
                data: {
                    balance: { increment: pnlUsd },
                    usedMargin: { decrement: position.margin },
                },
            })

            // 監査ログ
            await tx.auditLog.create({
                data: {
                    userId: position.account.userId,
                    action: closeReason === "TP" ? "TAKE_PROFIT_EXECUTED" : "STOP_LOSS_EXECUTED",
                    entityType: "Position",
                    entityId: position.id,
                    newValue: {
                        closePrice: Number(closePriceBigInt) / 10000,
                        pnlUsd: Number(pnlUsd) / 100,
                    },
                },
            })
        })

        console.log(`Position ${position.id}: Closed by ${closeReason} at ${Number(closePriceBigInt) / 10000}`)
    } catch (error) {
        console.error(`Position ${position.id} close error:`, error)
    }
}

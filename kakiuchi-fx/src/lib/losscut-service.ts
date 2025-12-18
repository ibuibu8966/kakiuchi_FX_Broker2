/**
 * Losscut (Forced Liquidation) Service
 * Monitors margin levels and auto-closes positions when below threshold
 */

import { prisma } from "./prisma"
import { getCurrentPrice, getUsdJpyRate } from "./fix-client"
import { calculateUnrealizedPnl, bigIntToAmount, priceToBigInt } from "./utils/bigint"

const LOSSCUT_THRESHOLD = 20 // 証拠金維持率20%以下でロスカット
const CHECK_INTERVAL = 5000  // 5秒ごとにチェック

/**
 * ロスカット監視を開始
 */
export function startLosscutMonitor() {
    console.log("Losscut: Monitor started (threshold: " + LOSSCUT_THRESHOLD + "%)")
    setInterval(checkAllAccounts, CHECK_INTERVAL)
}

/**
 * 全口座をチェック
 */
async function checkAllAccounts() {
    try {
        const currentPrice = getCurrentPrice()
        if (!currentPrice) return // 価格が取得できない場合はスキップ

        // オープンポジションがある口座を取得
        const accounts = await prisma.account.findMany({
            where: {
                usedMargin: { gt: 0n },
                status: "ACTIVE",
            },
            include: {
                positions: {
                    where: { status: "OPEN" },
                },
                user: {
                    select: { id: true, email: true },
                },
            },
        })

        for (const account of accounts) {
            await checkAccountMarginLevel(account, currentPrice)
        }
    } catch (error) {
        console.error("Losscut check error:", error)
    }
}

/**
 * 口座の証拠金維持率をチェックし、必要ならロスカット
 */
async function checkAccountMarginLevel(
    account: {
        id: string
        balance: bigint
        usedMargin: bigint
        positions: Array<{
            id: string
            side: string
            quantity: bigint
            entryPrice: bigint
            margin: bigint
        }>
        user: { id: string; email: string | null }
    },
    currentPrice: { bid: number; ask: number }
) {
    // 含み損益を計算
    let totalUnrealizedPnl = 0n
    const usdJpyRate = getUsdJpyRate()

    for (const position of account.positions) {
        const closePrice = position.side === "BUY" ? currentPrice.bid : currentPrice.ask
        const pnlJpy = calculateUnrealizedPnl(
            position.side as "BUY" | "SELL",
            position.quantity,
            position.entryPrice,
            priceToBigInt(closePrice)
        )
        // JPY → USD換算
        const pnlUsd = BigInt(Math.round(Number(pnlJpy) / usdJpyRate))
        totalUnrealizedPnl += pnlUsd
    }

    // 有効証拠金 = 残高 + 含み損益（USD）
    const equity = account.balance + totalUnrealizedPnl

    // 証拠金維持率
    const marginLevel = account.usedMargin > 0n
        ? (Number(equity) / Number(account.usedMargin)) * 100
        : Infinity

    // ロスカット判定
    if (marginLevel <= LOSSCUT_THRESHOLD) {
        console.log(`Losscut: Triggered for account ${account.id} (margin level: ${marginLevel.toFixed(2)}%)`)
        await executeLosscut(account, currentPrice, usdJpyRate)
    }
}

/**
 * ロスカット実行（全ポジション強制決済）
 */
async function executeLosscut(
    account: {
        id: string
        balance: bigint
        positions: Array<{
            id: string
            side: string
            quantity: bigint
            entryPrice: bigint
            margin: bigint
        }>
        user: { id: string; email: string | null }
    },
    currentPrice: { bid: number; ask: number },
    usdJpyRate: number
) {
    try {
        let totalPnlUsd = 0n
        let totalMarginReleased = 0n

        await prisma.$transaction(async (tx) => {
            for (const position of account.positions) {
                const closePrice = position.side === "BUY" ? currentPrice.bid : currentPrice.ask
                const closePriceBigInt = priceToBigInt(closePrice)

                // JPY損益計算
                const pnlJpy = calculateUnrealizedPnl(
                    position.side as "BUY" | "SELL",
                    position.quantity,
                    position.entryPrice,
                    closePriceBigInt
                )
                // USD換算
                const pnlUsd = BigInt(Math.round(Number(pnlJpy) / usdJpyRate))
                totalPnlUsd += pnlUsd
                totalMarginReleased += position.margin

                // ポジションをクローズ
                await tx.position.update({
                    where: { id: position.id },
                    data: {
                        status: "LIQUIDATED",
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
                        accountId: account.id,
                        positionId: position.id,
                        symbol: "GBPJPY",
                        side: position.side === "BUY" ? "SELL" : "BUY",
                        tradeType: "LIQUIDATION",
                        quantity: position.quantity,
                        price: closePriceBigInt,
                        pnl: pnlJpy,
                    },
                })
            }

            // 口座残高更新
            await tx.account.update({
                where: { id: account.id },
                data: {
                    balance: { increment: totalPnlUsd },
                    usedMargin: { decrement: totalMarginReleased },
                },
            })

            // 監査ログ
            await tx.auditLog.create({
                data: {
                    userId: account.user.id,
                    action: "LOSSCUT_EXECUTED",
                    entityType: "Account",
                    entityId: account.id,
                    newValue: {
                        positionsClosed: account.positions.length,
                        totalPnlUsd: Number(totalPnlUsd) / 100,
                    },
                },
            })
        })

        console.log(`Losscut: Completed for account ${account.id} - ${account.positions.length} positions closed, P/L: $${(Number(totalPnlUsd) / 100).toFixed(2)}`)
    } catch (error) {
        console.error(`Losscut execution error for account ${account.id}:`, error)
    }
}

/**
 * Swap Calculation Service
 * 毎日指定時刻にオーバーナイトスワップを計算
 */

import { prisma } from "./prisma"

let swapSchedulerInterval: NodeJS.Timeout | null = null
let lastSwapCalculationDate: string | null = null

/**
 * スワップ計算サービスを開始
 */
export function startSwapScheduler() {
    if (swapSchedulerInterval) return

    console.log("> Swap Scheduler started")

    // 1分ごとにチェック
    swapSchedulerInterval = setInterval(async () => {
        await checkAndCalculateSwap()
    }, 60000)

    // 起動時にもチェック
    checkAndCalculateSwap()
}

/**
 * スワップ計算サービスを停止
 */
export function stopSwapScheduler() {
    if (swapSchedulerInterval) {
        clearInterval(swapSchedulerInterval)
        swapSchedulerInterval = null
    }
}

/**
 * スワップ計算時間かどうかをチェックし、必要なら計算を実行
 */
async function checkAndCalculateSwap() {
    try {
        const settings = await prisma.systemSettings.findFirst()
        if (!settings) return

        const swapHour = settings.swapCalculationHour

        // 日本時間で現在時刻を取得
        const now = new Date()
        const jstOffset = 9 * 60 // JST = UTC+9
        const jstTime = new Date(now.getTime() + jstOffset * 60 * 1000)
        const currentHour = jstTime.getUTCHours()
        const currentDate = jstTime.toISOString().split('T')[0]

        // 指定時間（日本時間）かつ今日まだ計算していない場合に実行
        if (currentHour === swapHour && lastSwapCalculationDate !== currentDate) {
            console.log(`> Swap calculation triggered at ${currentHour}:00 JST`)
            await calculateSwapForAllPositions()
            lastSwapCalculationDate = currentDate
        }
    } catch (error) {
        console.error("Swap check error:", error)
    }
}

/**
 * 全オープンポジションに対してスワップを計算・適用
 */
export async function calculateSwapForAllPositions() {
    try {
        const settings = await prisma.systemSettings.findFirst()
        if (!settings) {
            console.log("Swap: No system settings found")
            return
        }

        const swapRateBuy = Number(settings.swapRateBuy)  // ×100でUSDT
        const swapRateSell = Number(settings.swapRateSell)

        if (swapRateBuy === 0 && swapRateSell === 0) {
            console.log("Swap: Rates are 0, skipping")
            return
        }

        // 全オープンポジションを取得
        const openPositions = await prisma.position.findMany({
            where: { status: "OPEN" },
        })

        if (openPositions.length === 0) {
            console.log("Swap: No open positions")
            return
        }

        // 水曜日は週末分として3日分
        const now = new Date()
        const jstOffset = 9 * 60
        const jstTime = new Date(now.getTime() + jstOffset * 60 * 1000)
        const dayOfWeek = jstTime.getUTCDay() // 0=日, 3=水
        const multiplier = dayOfWeek === 3 ? 3 : 1

        console.log(`Swap: Calculating for ${openPositions.length} positions (multiplier: ${multiplier})`)

        for (const position of openPositions) {
            const lots = Number(position.quantity) / 1000 // ×1000で格納
            const rate = position.side === "BUY" ? swapRateBuy : swapRateSell

            // スワップ額 = ロット数 × レート × 日数
            const swapAmount = Math.round(lots * rate * multiplier)

            if (swapAmount === 0) continue

            // スワップを累積に加算
            await prisma.position.update({
                where: { id: position.id },
                data: {
                    accumulatedSwap: {
                        increment: BigInt(swapAmount),
                    },
                    lastSwapAccrualAt: new Date(),
                },
            })

            console.log(`Swap: Position ${position.id} - ${lots} lots, swap: ${swapAmount / 100} USDT`)
        }

        console.log("Swap: Calculation completed")
    } catch (error) {
        console.error("Swap calculation error:", error)
    }
}

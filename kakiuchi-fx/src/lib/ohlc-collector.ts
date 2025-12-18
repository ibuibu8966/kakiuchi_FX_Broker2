/**
 * OHLC Data Collector Service
 * バックグラウンドで1分足OHLCデータを収集・保存
 */

import { Timeframe, PrismaClient } from "@prisma/client"

// グローバルにキャッシュしたPrismaClient（開発時のホットリロード対策）
const globalForPrisma = globalThis as unknown as {
    ohlcPrisma: PrismaClient | undefined
}

const prisma = globalForPrisma.ohlcPrisma ?? new PrismaClient({
    log: ['error'],
})

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.ohlcPrisma = prisma
}

interface PriceQuote {
    symbol: string
    bid: number
    ask: number
    timestamp: Date
}

interface OHLCCandle {
    symbol: string
    open: number
    high: number
    low: number
    close: number
    volume: number
    timestamp: Date  // 足の開始時刻
}

// 現在進行中の1分足（メモリ内）
let currentCandle: OHLCCandle | null = null
let lastSaveTime: Date | null = null
let isInitialized = false

// 価格をBigInt（×100000）に変換（5桁精度）
function priceToBigInt(price: number): bigint {
    return BigInt(Math.round(price * 100000))
}

// 1分足の開始時刻を計算
function getMinuteStart(date: Date): Date {
    const d = new Date(date)
    d.setSeconds(0, 0)
    return d
}

/**
 * 完成した1分足をデータベースに保存
 */
async function saveCandle(candle: OHLCCandle): Promise<void> {
    try {
        await prisma.priceData.upsert({
            where: {
                symbol_timeframe_timestamp: {
                    symbol: candle.symbol,
                    timeframe: Timeframe.M1,
                    timestamp: candle.timestamp,
                }
            },
            update: {
                open: priceToBigInt(candle.open),
                high: priceToBigInt(candle.high),
                low: priceToBigInt(candle.low),
                close: priceToBigInt(candle.close),
                volume: BigInt(candle.volume),
            },
            create: {
                symbol: candle.symbol,
                timeframe: Timeframe.M1,
                timestamp: candle.timestamp,
                open: priceToBigInt(candle.open),
                high: priceToBigInt(candle.high),
                low: priceToBigInt(candle.low),
                close: priceToBigInt(candle.close),
                volume: BigInt(candle.volume),
            },
        })
        console.log(`OHLC: Saved M1 candle for ${candle.symbol} at ${candle.timestamp.toISOString()}`)
    } catch (error) {
        console.error("OHLC: Failed to save candle:", error)
    }
}

/**
 * 価格更新を受け取り1分足を集計
 */
export function onPriceUpdate(price: PriceQuote): void {
    if (!isInitialized) return

    const midPrice = (price.bid + price.ask) / 2
    const currentMinute = getMinuteStart(price.timestamp)

    if (!currentCandle) {
        // 新しい足を開始
        currentCandle = {
            symbol: price.symbol,
            open: midPrice,
            high: midPrice,
            low: midPrice,
            close: midPrice,
            volume: 1,
            timestamp: currentMinute,
        }
        return
    }

    // 新しい分になったか確認
    if (currentMinute.getTime() > currentCandle.timestamp.getTime()) {
        // 前の足を保存
        saveCandle(currentCandle)
        lastSaveTime = new Date()

        // 新しい足を開始
        currentCandle = {
            symbol: price.symbol,
            open: midPrice,
            high: midPrice,
            low: midPrice,
            close: midPrice,
            volume: 1,
            timestamp: currentMinute,
        }
    } else {
        // 現在の足を更新
        currentCandle.high = Math.max(currentCandle.high, midPrice)
        currentCandle.low = Math.min(currentCandle.low, midPrice)
        currentCandle.close = midPrice
        currentCandle.volume++
    }
}

/**
 * 現在進行中の足を取得
 */
export function getCurrentCandle(): OHLCCandle | null {
    return currentCandle
}

/**
 * 最後に保存した時刻を取得
 */
export function getLastSaveTime(): Date | null {
    return lastSaveTime
}

/**
 * OHLC収集を初期化
 */
export function initOHLCCollector(): void {
    if (isInitialized) {
        console.log("OHLC: Already initialized")
        return
    }

    isInitialized = true
    console.log("OHLC: Collector initialized - will save M1 candles to database")

    // 定期的にDBに保存（1分ごと）- 価格更新がない場合のフォールバック
    setInterval(() => {
        if (currentCandle && lastSaveTime) {
            const now = new Date()
            const currentMinute = getMinuteStart(now)

            // 現在の足が古い場合は保存
            if (currentMinute.getTime() > currentCandle.timestamp.getTime()) {
                saveCandle(currentCandle)
                lastSaveTime = new Date()
                currentCandle = null
            }
        }
    }, 60000) // 1分ごとにチェック
}

/**
 * OHLC収集を停止
 */
export function stopOHLCCollector(): void {
    if (currentCandle) {
        saveCandle(currentCandle)
        currentCandle = null
    }
    isInitialized = false
    console.log("OHLC: Collector stopped")
}

/**
 * 収集状態を確認
 */
export function isCollectorRunning(): boolean {
    return isInitialized
}

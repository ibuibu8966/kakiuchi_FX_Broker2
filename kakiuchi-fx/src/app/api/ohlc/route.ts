import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Timeframe } from "@prisma/client"

export const dynamic = "force-dynamic"
export const revalidate = 0

// タイムフレーム文字列とenumのマッピング
const TIMEFRAME_MAP: Record<string, Timeframe> = {
    "M1": Timeframe.M1,
    "1m": Timeframe.M1,
    "M5": Timeframe.M5,
    "5m": Timeframe.M5,
    "M15": Timeframe.M15,
    "15m": Timeframe.M15,
    "M30": Timeframe.M30,
    "30m": Timeframe.M30,
    "H1": Timeframe.H1,
    "1H": Timeframe.H1,
    "H4": Timeframe.H4,
    "4H": Timeframe.H4,
    "D1": Timeframe.D1,
    "1D": Timeframe.D1,
    "W1": Timeframe.W1,
}

// タイムフレームごとの1分足の本数
const TIMEFRAME_MINUTES: Record<Timeframe, number> = {
    [Timeframe.M1]: 1,
    [Timeframe.M5]: 5,
    [Timeframe.M15]: 15,
    [Timeframe.M30]: 30,
    [Timeframe.H1]: 60,
    [Timeframe.H4]: 240,
    [Timeframe.D1]: 1440,
    [Timeframe.W1]: 10080,
}

// BigIntをnumberに変換（5桁精度）
function bigIntToPrice(value: bigint): number {
    return Number(value) / 100000
}

interface OHLC {
    time: number  // Unix timestamp in seconds
    open: number
    high: number
    low: number
    close: number
}

/**
 * 1分足データから上位時間足を集計
 */
function aggregateCandles(m1Candles: OHLC[], targetTimeframe: Timeframe): OHLC[] {
    if (targetTimeframe === Timeframe.M1) {
        return m1Candles
    }

    const minutes = TIMEFRAME_MINUTES[targetTimeframe]
    const aggregated: OHLC[] = []

    // タイムフレームごとにグループ化
    const groups = new Map<number, OHLC[]>()

    for (const candle of m1Candles) {
        // この足が属する上位時間足の開始時刻を計算
        const periodStart = Math.floor(candle.time / (minutes * 60)) * (minutes * 60)

        if (!groups.has(periodStart)) {
            groups.set(periodStart, [])
        }
        groups.get(periodStart)!.push(candle)
    }

    // 各グループを1本の足に集計
    for (const [time, candles] of groups) {
        if (candles.length === 0) continue

        candles.sort((a, b) => a.time - b.time)

        aggregated.push({
            time,
            open: candles[0].open,
            high: Math.max(...candles.map(c => c.high)),
            low: Math.min(...candles.map(c => c.low)),
            close: candles[candles.length - 1].close,
        })
    }

    aggregated.sort((a, b) => a.time - b.time)
    return aggregated
}

/**
 * GET /api/ohlc
 * 履歴OHLCデータを取得
 * 
 * Query params:
 * - symbol: 通貨ペア（デフォルト: GBPJPY）
 * - timeframe: 時間足（M1, M5, M15, H1, H4, D1, W1）
 * - limit: 取得本数（デフォルト: 200）
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const symbol = searchParams.get("symbol") || "GBPJPY"
        const tfParam = searchParams.get("timeframe") || "M1"
        const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 1000)

        const timeframe = TIMEFRAME_MAP[tfParam]
        if (!timeframe) {
            return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 })
        }

        // M1データを取得（上位時間足も1分足から集計するため）
        const minutes = TIMEFRAME_MINUTES[timeframe]
        const requiredM1Candles = limit * minutes

        let m1Data: Array<{
            timestamp: Date
            open: bigint
            high: bigint
            low: bigint
            close: bigint
        }> = []

        try {
            m1Data = await prisma.priceData.findMany({
                where: {
                    symbol,
                    timeframe: Timeframe.M1,
                },
                orderBy: { timestamp: "desc" },
                take: requiredM1Candles,
            })
        } catch (dbError) {
            console.error("Database error in OHLC API:", dbError)
            // データベースエラー時は空データを返す
            return NextResponse.json({
                symbol,
                timeframe: tfParam,
                count: 0,
                data: [],
            })
        }

        // OHLCフォーマットに変換
        const m1Candles: OHLC[] = m1Data.map(d => ({
            time: Math.floor(d.timestamp.getTime() / 1000),
            open: bigIntToPrice(d.open),
            high: bigIntToPrice(d.high),
            low: bigIntToPrice(d.low),
            close: bigIntToPrice(d.close),
        })).reverse()  // 古い順にソート

        // 上位時間足に集計
        const candles = aggregateCandles(m1Candles, timeframe)

        // 現在進行中の足はフロントエンドでリアルタイム価格から計算される

        // 最新のlimit本を返す
        const result = candles.slice(-limit)

        return NextResponse.json({
            symbol,
            timeframe: tfParam,
            count: result.length,
            data: result,
        })
    } catch (error) {
        console.error("OHLC API error:", error)
        // 致命的エラー時も空データを返す（500エラーを回避）
        return NextResponse.json({
            symbol: "GBPJPY",
            timeframe: "M1",
            count: 0,
            data: [],
        })
    }
}

import { NextResponse } from "next/server"
import { getCurrentPrice } from "@/lib/fix-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * GET /api/price
 * 現在のGBPJPY価格を取得
 */
export async function GET() {
    try {
        const price = getCurrentPrice()

        // 価格が取得できない場合はメンテナンス中エラー
        if (!price) {
            return NextResponse.json({
                error: "現在サーバーメンテナンス中です",
                maintenance: true,
            }, { status: 503 })
        }

        return NextResponse.json({
            symbol: price.symbol,
            bid: price.bid,
            ask: price.ask,
            spread: Math.round((price.ask - price.bid) * 100) / 100,
            timestamp: price.timestamp.toISOString(),
            source: process.env.PRICE_FEED_MODE || "unknown",
            maintenance: false,
        })
    } catch (error) {
        console.error("Price API error:", error)
        return NextResponse.json({
            error: "現在サーバーメンテナンス中です",
            maintenance: true,
        }, { status: 503 })
    }
}


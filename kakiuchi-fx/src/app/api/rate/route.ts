import { NextResponse } from "next/server"
import { getUsdJpyRate } from "@/lib/fix-client"

/**
 * GET /api/rate
 * 現在のUSD/JPYレートを取得
 */
export async function GET() {
    try {
        const usdJpyRate = getUsdJpyRate()

        return NextResponse.json({
            usdJpy: usdJpyRate,
            timestamp: new Date().toISOString(),
            source: process.env.PRICE_FEED_MODE || "mock",
        })
    } catch (error) {
        console.error("Rate API error:", error)
        return NextResponse.json(
            { error: "レート取得に失敗しました", usdJpy: 150.0 },
            { status: 500 }
        )
    }
}

"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createChart, ColorType, CandlestickData, Time, CandlestickSeries, LineSeries } from "lightweight-charts"

interface TradingChartProps {
    currentBid: number
    currentAsk: number
}

type ChartType = "candlestick" | "line"
type Timeframe = "1m" | "5m" | "15m" | "1H" | "4H" | "1D"

// タイムフレームに応じた秒数
const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1H": 3600,
    "4H": 14400,
    "1D": 86400,
}

// 過去400本分のデータを生成（現在価格から逆算）
function generateHistoricalData(timeframe: Timeframe, currentPrice: number = 207.8): CandlestickData<Time>[] {
    const data: CandlestickData<Time>[] = []
    const now = new Date()
    const intervalSeconds = TIMEFRAME_SECONDS[timeframe]
    const barCount = 400 // 全タイムフレームで400本

    // 終値から逆算して開始価格を計算
    let price = currentPrice
    const prices: number[] = [price]

    // タイムフレームに応じたボラティリティ（pips）
    const volatilityPips: Record<Timeframe, number> = {
        "1m": 3,
        "5m": 8,
        "15m": 15,
        "1H": 30,
        "4H": 60,
        "1D": 150,
    }
    const vol = volatilityPips[timeframe] * 0.001 // pips to price

    // 逆方向に価格履歴を生成
    for (let i = 0; i < barCount; i++) {
        const change = (Math.random() - 0.5) * vol * 2
        price = price - change
        prices.unshift(price)
    } // prices[0] is oldest

    // 正方向にローソク足データを構築
    for (let i = 0; i < barCount; i++) {
        const time = new Date(now.getTime() - (barCount - i) * intervalSeconds * 1000)
        const timestamp = Math.floor(time.getTime() / 1000)

        const open = prices[i]
        const close = prices[i + 1] || prices[i]
        const range = vol * (0.5 + Math.random())
        const high = Math.max(open, close) + Math.random() * range
        const low = Math.min(open, close) - Math.random() * range

        data.push({
            time: timestamp as Time,
            open: parseFloat(open.toFixed(3)),
            high: parseFloat(high.toFixed(3)),
            low: parseFloat(low.toFixed(3)),
            close: parseFloat(close.toFixed(3)),
        })
    }

    return data
}

export function TradingChart({ currentBid, currentAsk }: TradingChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seriesRef = useRef<any>(null)
    const lastBarRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null)
    const historicalDataRef = useRef<CandlestickData<Time>[]>([])
    const isDisposedRef = useRef(false)

    const [chartType, setChartType] = useState<ChartType>("candlestick")
    const [timeframe, setTimeframe] = useState<Timeframe>("1m")

    // チャート作成関数
    const createChartInstance = useCallback(() => {
        if (!chartContainerRef.current || isDisposedRef.current) return

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#94a3b8",
            },
            grid: {
                vertLines: { color: "rgba(51, 65, 85, 0.5)" },
                horzLines: { color: "rgba(51, 65, 85, 0.5)" },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            rightPriceScale: {
                borderColor: "rgba(51, 65, 85, 0.8)",
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderColor: "rgba(51, 65, 85, 0.8)",
                timeVisible: true,
                secondsVisible: false,
            },
            crosshair: {
                mode: 1,
                vertLine: { width: 1, color: "rgba(59, 130, 246, 0.5)", labelBackgroundColor: "#1e293b" },
                horzLine: { width: 1, color: "rgba(59, 130, 246, 0.5)", labelBackgroundColor: "#1e293b" },
            },
        })

        // タイムフレーム変更時は新しいデータを生成
        historicalDataRef.current = generateHistoricalData(timeframe)

        let series
        if (chartType === "candlestick") {
            series = chart.addSeries(CandlestickSeries, {
                upColor: "#22c55e",
                downColor: "#ef4444",
                borderUpColor: "#22c55e",
                borderDownColor: "#ef4444",
                wickUpColor: "#22c55e",
                wickDownColor: "#ef4444",
            })
            series.setData(historicalDataRef.current)
        } else {
            series = chart.addSeries(LineSeries, {
                color: "#3b82f6",
                lineWidth: 2,
            })
            const lineData = historicalDataRef.current.map(d => ({
                time: d.time,
                value: d.close,
            }))
            series.setData(lineData)
        }

        // 最新バーを記録
        if (historicalDataRef.current.length > 0) {
            const lastData = historicalDataRef.current[historicalDataRef.current.length - 1]
            lastBarRef.current = {
                time: lastData.time as number,
                open: lastData.open,
                high: lastData.high,
                low: lastData.low,
                close: lastData.close,
            }
        }

        chartRef.current = chart
        seriesRef.current = series

        chart.timeScale().scrollToRealTime()

        return chart
    }, [chartType, timeframe])

    // チャート初期化 & チャートタイプ/タイムフレーム切り替え
    useEffect(() => {
        isDisposedRef.current = false

        if (chartRef.current) {
            try {
                chartRef.current.remove()
            } catch (e) {
                // ignore
            }
            chartRef.current = null
            seriesRef.current = null
        }

        const chart = createChartInstance()

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current && !isDisposedRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth })
            }
        }
        window.addEventListener("resize", handleResize)

        return () => {
            isDisposedRef.current = true
            window.removeEventListener("resize", handleResize)
            if (chart) {
                try {
                    chart.remove()
                } catch (e) {
                    // ignore
                }
            }
            chartRef.current = null
            seriesRef.current = null
        }
    }, [chartType, timeframe, createChartInstance])

    // リアルタイム更新（1分足のときのみ）
    useEffect(() => {
        if (!seriesRef.current || !lastBarRef.current || isDisposedRef.current) return
        if (timeframe !== "1m") return // 1分足以外はリアルタイム更新しない

        const currentTime = Math.floor(Date.now() / 1000)
        const currentMinute = Math.floor(currentTime / 60) * 60
        const price = (currentBid + currentAsk) / 2

        try {
            if (chartType === "candlestick") {
                if (currentMinute > lastBarRef.current.time) {
                    const newBar = { time: currentMinute as Time, open: price, high: price, low: price, close: price }
                    seriesRef.current.update(newBar)
                    lastBarRef.current = { time: currentMinute, open: price, high: price, low: price, close: price }
                } else {
                    const updatedBar = {
                        time: lastBarRef.current.time as Time,
                        open: lastBarRef.current.open,
                        high: Math.max(lastBarRef.current.high, price),
                        low: Math.min(lastBarRef.current.low, price),
                        close: price,
                    }
                    seriesRef.current.update(updatedBar)
                    lastBarRef.current = { ...lastBarRef.current, high: updatedBar.high, low: updatedBar.low, close: price }
                }
            } else {
                if (currentMinute > lastBarRef.current.time) {
                    seriesRef.current.update({ time: currentMinute as Time, value: price })
                    lastBarRef.current = { time: currentMinute, open: price, high: price, low: price, close: price }
                } else {
                    seriesRef.current.update({ time: lastBarRef.current.time as Time, value: price })
                    lastBarRef.current = { ...lastBarRef.current, close: price }
                }
            }
        } catch (e) {
            // ignore
        }
    }, [currentBid, currentAsk, chartType, timeframe])

    const timeframes: Timeframe[] = ["1m", "5m", "15m", "1H", "4H", "1D"]

    return (
        <div className="relative">
            <div ref={chartContainerRef} className="w-full" />

            {/* タイムフレームセレクタ */}
            <div className="absolute top-2 left-2 flex gap-1 z-10">
                {timeframes.map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${timeframe === tf
                            ? "bg-blue-600 text-white"
                            : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                            }`}
                    >
                        {tf}
                    </button>
                ))}
            </div>

            {/* チャートタイプセレクタ */}
            <div className="absolute top-2 right-2 flex gap-1 z-10">
                <button
                    onClick={() => setChartType("candlestick")}
                    className={`px-2 py-1 text-xs rounded transition-colors ${chartType === "candlestick"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                        }`}
                >
                    ローソク
                </button>
                <button
                    onClick={() => setChartType("line")}
                    className={`px-2 py-1 text-xs rounded transition-colors ${chartType === "line"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                        }`}
                >
                    ライン
                </button>
            </div>
        </div>
    )
}

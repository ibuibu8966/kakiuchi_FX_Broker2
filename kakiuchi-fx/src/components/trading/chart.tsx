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

export function TradingChart({ currentBid, currentAsk }: TradingChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seriesRef = useRef<any>(null)
    const lastBarRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null)
    const dataRef = useRef<CandlestickData<Time>[]>([])
    const isDisposedRef = useRef(false)

    const [chartType, setChartType] = useState<ChartType>("candlestick")
    const [timeframe, setTimeframe] = useState<Timeframe>("1m")

    // タイムフレームに応じた現在のバー時刻を取得
    const getCurrentBarTime = useCallback((tf: Timeframe) => {
        const intervalSeconds = TIMEFRAME_SECONDS[tf]
        const currentTime = Math.floor(Date.now() / 1000)
        return Math.floor(currentTime / intervalSeconds) * intervalSeconds
    }, [])

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
            height: 300,
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

        // 空のデータで開始
        dataRef.current = []
        lastBarRef.current = null

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
        } else {
            series = chart.addSeries(LineSeries, {
                color: "#3b82f6",
                lineWidth: 2,
            })
        }

        chartRef.current = chart
        seriesRef.current = series

        chart.timeScale().scrollToRealTime()

        return chart
    }, [chartType])

    // チャート初期化 & チャートタイプ/タイムフレーム切り替え
    useEffect(() => {
        isDisposedRef.current = false

        if (chartRef.current) {
            try {
                chartRef.current.remove()
            } catch {
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
                } catch {
                    // ignore
                }
            }
            chartRef.current = null
            seriesRef.current = null
        }
    }, [chartType, timeframe, createChartInstance])

    // リアルタイム更新
    useEffect(() => {
        if (!seriesRef.current || isDisposedRef.current) return
        if (currentBid <= 0 || currentAsk <= 0) return // 有効な価格データがない場合はスキップ

        const intervalSeconds = TIMEFRAME_SECONDS[timeframe]
        const currentTime = Math.floor(Date.now() / 1000)
        const currentBarTime = Math.floor(currentTime / intervalSeconds) * intervalSeconds
        const price = (currentBid + currentAsk) / 2

        try {
            if (chartType === "candlestick") {
                if (!lastBarRef.current || currentBarTime > lastBarRef.current.time) {
                    // 新しいバーを開始
                    const newBar = { time: currentBarTime as Time, open: price, high: price, low: price, close: price }
                    seriesRef.current.update(newBar)
                    lastBarRef.current = { time: currentBarTime, open: price, high: price, low: price, close: price }
                    dataRef.current.push(newBar)
                } else {
                    // 現在のバーを更新
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
                // ラインチャート
                if (!lastBarRef.current || currentBarTime > lastBarRef.current.time) {
                    seriesRef.current.update({ time: currentBarTime as Time, value: price })
                    lastBarRef.current = { time: currentBarTime, open: price, high: price, low: price, close: price }
                } else {
                    seriesRef.current.update({ time: lastBarRef.current.time as Time, value: price })
                    lastBarRef.current = { ...lastBarRef.current, close: price }
                }
            }
        } catch {
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


"use client"

import { useEffect, useState, useRef } from "react"

interface PriceData {
    symbol: string
    bid: number
    ask: number
    timestamp: string
}

// 市場クローズ判定: この秒数以上価格更新がなければクローズと判定
const MARKET_CLOSED_THRESHOLD_MS = 10000 // 10秒

export function useWebSocketPrice(pollingMs = 200) {
    const [price, setPrice] = useState<PriceData | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isMarketClosed, setIsMarketClosed] = useState(false)
    const isMountedRef = useRef(true)
    const lastValidPriceRef = useRef<{ bid: number; ask: number } | null>(null)
    const lastPriceUpdateTimeRef = useRef<number>(Date.now())
    const lastReceivedTimestampRef = useRef<string>("")

    useEffect(() => {
        isMountedRef.current = true

        const fetchPrice = async () => {
            try {
                const res = await fetch("/api/price")
                if (res.ok && isMountedRef.current) {
                    const data = await res.json()
                    const newBid = data.bid
                    const newAsk = data.ask
                    const newTimestamp = data.timestamp

                    // 価格フィルタリング: 範囲外チェック (GBPJPYは180-230の範囲)
                    if (newBid < 180 || newBid > 230 || newAsk < 180 || newAsk > 230) {
                        console.warn(`[useWebSocketPrice] Abnormal price (out of range): bid=${newBid}, ask=${newAsk}, skipping`)
                        return // 異常価格はスキップ
                    }

                    // 急激な変動チェック (前回から3円以上の変動は異常)
                    if (lastValidPriceRef.current) {
                        const bidChange = Math.abs(newBid - lastValidPriceRef.current.bid)
                        const askChange = Math.abs(newAsk - lastValidPriceRef.current.ask)
                        if (bidChange > 3 || askChange > 3) {
                            console.warn(`[useWebSocketPrice] Abnormal price change: bid ${lastValidPriceRef.current.bid} -> ${newBid} (${bidChange.toFixed(3)}), ask ${lastValidPriceRef.current.ask} -> ${newAsk} (${askChange.toFixed(3)}), skipping`)
                            return // 異常変動はスキップ
                        }
                    }

                    // タイムスタンプが変わっていれば新しい価格
                    if (newTimestamp !== lastReceivedTimestampRef.current) {
                        lastReceivedTimestampRef.current = newTimestamp
                        lastPriceUpdateTimeRef.current = Date.now()
                        setIsMarketClosed(false)
                    }

                    // 正常な価格を保存
                    lastValidPriceRef.current = { bid: newBid, ask: newAsk }
                    setPrice({
                        symbol: data.symbol || "GBPJPY",
                        bid: newBid,
                        ask: newAsk,
                        timestamp: newTimestamp,
                    })
                    setIsConnected(true)
                }
            } catch {
                if (isMountedRef.current) {
                    setIsConnected(false)
                }
            }
        }

        // 市場クローズ判定のチェッカー
        const checkMarketClosed = () => {
            const timeSinceLastUpdate = Date.now() - lastPriceUpdateTimeRef.current
            if (timeSinceLastUpdate > MARKET_CLOSED_THRESHOLD_MS && isMountedRef.current) {
                setIsMarketClosed(true)
            }
        }

        fetchPrice()
        const priceInterval = setInterval(fetchPrice, pollingMs)
        const marketCheckInterval = setInterval(checkMarketClosed, 1000)

        return () => {
            isMountedRef.current = false
            clearInterval(priceInterval)
            clearInterval(marketCheckInterval)
        }
    }, [pollingMs])

    return { price, isConnected, isMarketClosed }
}

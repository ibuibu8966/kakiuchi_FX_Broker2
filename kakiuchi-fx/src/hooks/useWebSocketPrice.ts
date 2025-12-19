"use client"

import { useEffect, useState, useRef } from "react"

interface PriceData {
    symbol: string
    bid: number
    ask: number
    timestamp: string
}

export function useWebSocketPrice(pollingMs = 200) {
    const [price, setPrice] = useState<PriceData | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const isMountedRef = useRef(true)
    const lastValidPriceRef = useRef<{ bid: number; ask: number } | null>(null)

    useEffect(() => {
        isMountedRef.current = true

        const fetchPrice = async () => {
            try {
                const res = await fetch("/api/price")
                if (res.ok && isMountedRef.current) {
                    const data = await res.json()
                    const newBid = data.bid
                    const newAsk = data.ask

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

                    // 正常な価格を保存
                    lastValidPriceRef.current = { bid: newBid, ask: newAsk }
                    setPrice({
                        symbol: data.symbol || "GBPJPY",
                        bid: newBid,
                        ask: newAsk,
                        timestamp: data.timestamp,
                    })
                    setIsConnected(true)
                }
            } catch {
                if (isMountedRef.current) {
                    setIsConnected(false)
                }
            }
        }

        fetchPrice()
        const interval = setInterval(fetchPrice, pollingMs)

        return () => {
            isMountedRef.current = false
            clearInterval(interval)
        }
    }, [pollingMs])

    return { price, isConnected }
}


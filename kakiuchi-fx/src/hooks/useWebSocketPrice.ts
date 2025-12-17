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

    useEffect(() => {
        isMountedRef.current = true

        const fetchPrice = async () => {
            try {
                const res = await fetch("/api/price")
                if (res.ok && isMountedRef.current) {
                    const data = await res.json()
                    setPrice({
                        symbol: data.symbol || "GBPJPY",
                        bid: data.bid,
                        ask: data.ask,
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

"use client"

import { useEffect, useState, useRef, useCallback } from "react"

interface PriceData {
    symbol: string
    bid: number
    ask: number
    timestamp: string
}

export function useWebSocketPrice(fallbackPollingMs = 200) {
    const [price, setPrice] = useState<PriceData | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const connect = useCallback(() => {
        if (typeof window === 'undefined') return

        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            const wsUrl = `${protocol}//${window.location.host}/ws/price`

            const ws = new WebSocket(wsUrl)
            wsRef.current = ws

            ws.onopen = () => {
                console.log("WebSocket: Connected")
                setIsConnected(true)
            }

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    if (data.type === "price") {
                        setPrice({
                            symbol: data.symbol,
                            bid: data.bid,
                            ask: data.ask,
                            timestamp: data.timestamp,
                        })
                    }
                } catch (e) {
                    console.error("WebSocket: Parse error", e)
                }
            }

            ws.onclose = () => {
                console.log("WebSocket: Disconnected, reconnecting...")
                setIsConnected(false)
                wsRef.current = null
                // Reconnect after 1 second
                reconnectTimeoutRef.current = setTimeout(connect, 1000)
            }

            ws.onerror = (error) => {
                console.error("WebSocket: Error", error)
                ws.close()
            }
        } catch (e) {
            console.error("WebSocket: Connection failed", e)
            // Fallback to polling
            setIsConnected(false)
        }
    }, [])

    // Fallback polling when WebSocket is not connected
    useEffect(() => {
        if (isConnected) return

        const fetchPrice = async () => {
            try {
                const res = await fetch("/api/price")
                if (res.ok) {
                    const data = await res.json()
                    setPrice({
                        symbol: data.symbol || "GBPJPY",
                        bid: data.bid,
                        ask: data.ask,
                        timestamp: data.timestamp,
                    })
                }
            } catch (e) {
                console.error("Price fetch error:", e)
            }
        }

        fetchPrice()
        const interval = setInterval(fetchPrice, fallbackPollingMs)
        return () => clearInterval(interval)
    }, [isConnected, fallbackPollingMs])

    useEffect(() => {
        connect()

        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
        }
    }, [connect])

    return { price, isConnected }
}

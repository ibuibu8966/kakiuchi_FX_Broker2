/**
 * Custom Server with WebSocket Support
 * Combines Next.js with WebSocket for real-time FIX price streaming
 */

import { createServer } from "http"
import { parse } from "url"
import next from "next"
import { WebSocketServer, WebSocket } from "ws"
import { connectToFIX, getCurrentPrice } from "./src/lib/fix-client"

const dev = process.env.NODE_ENV !== "production"
const hostname = "localhost"
const port = parseInt(process.env.PORT || "3000", 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// WebSocket clients
const wsClients = new Set<WebSocket>()

// Broadcast price to all WebSocket clients
function broadcastPrice(price: { symbol: string; bid: number; ask: number; timestamp: Date }) {
    const message = JSON.stringify({
        type: "price",
        symbol: price.symbol,
        bid: price.bid,
        ask: price.ask,
        timestamp: price.timestamp.toISOString(),
    })

    wsClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message)
        }
    })
}

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url || "", true)
            await handle(req, res, parsedUrl)
        } catch (err) {
            console.error("Error handling request:", err)
            res.statusCode = 500
            res.end("Internal Server Error")
        }
    })

    // WebSocket server
    const wss = new WebSocketServer({ server, path: "/ws/price" })

    wss.on("connection", (ws, req) => {
        console.log("WebSocket: Client connected")
        wsClients.add(ws)

        // Send current price immediately
        const currentPrice = getCurrentPrice()
        if (currentPrice) {
            ws.send(JSON.stringify({
                type: "price",
                symbol: currentPrice.symbol,
                bid: currentPrice.bid,
                ask: currentPrice.ask,
                timestamp: currentPrice.timestamp.toISOString(),
            }))
        }

        ws.on("close", () => {
            console.log("WebSocket: Client disconnected")
            wsClients.delete(ws)
        })

        ws.on("error", (err) => {
            console.error("WebSocket error:", err.message)
            wsClients.delete(ws)
        })
    })

    // Set up FIX price update callback
    interface PriceQuote {
        symbol: string
        bid: number
        ask: number
        timestamp: Date
    }

    (globalThis as Record<string, unknown>).onFIXPriceUpdate = (price: PriceQuote) => {
        broadcastPrice(price)
    }

    // Start FIX connection
    connectToFIX()

    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`)
        console.log(`> WebSocket available at ws://${hostname}:${port}/ws/price`)
    })
})

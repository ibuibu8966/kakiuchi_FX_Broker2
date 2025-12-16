/**
 * WebSocket Price Server
 * FIXからのリアルタイム価格をWebSocketでブロードキャスト
 */

import { WebSocketServer, WebSocket } from "ws"
import { IncomingMessage } from "http"

let wss: WebSocketServer | null = null
const clients = new Set<WebSocket>()

export function initWebSocketServer(server: import("http").Server) {
    if (wss) return wss

    wss = new WebSocketServer({ server, path: "/ws/price" })

    wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
        console.log("WebSocket: Client connected from", req.socket.remoteAddress)
        clients.add(ws)

        ws.on("close", () => {
            console.log("WebSocket: Client disconnected")
            clients.delete(ws)
        })

        ws.on("error", (err) => {
            console.error("WebSocket error:", err.message)
            clients.delete(ws)
        })
    })

    console.log("WebSocket: Price server initialized")
    return wss
}

export function broadcastPrice(price: { symbol: string; bid: number; ask: number; timestamp: Date }) {
    const message = JSON.stringify({
        type: "price",
        ...price,
        timestamp: price.timestamp.toISOString(),
    })

    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message)
        }
    })
}

export function getClientCount(): number {
    return clients.size
}

/**
 * FIX API Price Service
 * cTrader FIX プロトコルで価格を取得
 */

import * as tls from "tls"
import * as net from "net"

interface PriceQuote {
    symbol: string
    bid: number
    ask: number
    timestamp: Date
}

interface FIXConfig {
    host: string
    port: number
    useSSL: boolean
    senderCompID: string
    targetCompID: string
    senderSubID: string
    password: string
}

let cachedPrice: PriceQuote | null = null
let lastUpdateTime: Date | null = null
let connectionAttempted = false
let msgSeqNum = 1

function getConfig(): FIXConfig {
    return {
        host: process.env.FIX_HOST || "live-uk-eqx-01.p.c-trader.com",
        port: parseInt(process.env.FIX_PORT_SSL || "5211"),
        useSSL: true,
        senderCompID: process.env.FIX_SENDER_COMP_ID || "",
        targetCompID: process.env.FIX_TARGET_COMP_ID || "cServer",
        senderSubID: process.env.FIX_SENDER_SUB_ID || "QUOTE",
        password: process.env.FIX_PASSWORD || "",
    }
}

function calculateChecksum(message: string): string {
    let sum = 0
    for (let i = 0; i < message.length; i++) {
        sum += message.charCodeAt(i)
    }
    return (sum % 256).toString().padStart(3, "0")
}

function buildFIXMessage(msgType: string, fields: Record<string, string>, config: FIXConfig): string {
    const SOH = "\x01"
    const now = new Date()
    const pad = (n: number, len = 2) => n.toString().padStart(len, "0")
    const timestamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}.${pad(now.getUTCMilliseconds(), 3)}`

    const bodyFields = [
        `35=${msgType}`,
        `49=${config.senderCompID}`,
        `56=${config.targetCompID}`,
        `50=${config.senderSubID}`,
        `57=${config.senderSubID}`,
        `34=${msgSeqNum++}`,
        `52=${timestamp}`,
        ...Object.entries(fields).map(([tag, value]) => `${tag}=${value}`),
    ].join(SOH) + SOH

    const bodyLength = Buffer.byteLength(bodyFields, "utf8")
    const header = `8=FIX.4.4${SOH}9=${bodyLength}${SOH}`
    const messageWithoutChecksum = header + bodyFields
    const checksum = calculateChecksum(messageWithoutChecksum)
    return messageWithoutChecksum + `10=${checksum}${SOH}`
}

function parseFIXMessage(message: string): Record<string, string> {
    const SOH = "\x01"
    const fields: Record<string, string> = {}
    const parts = message.split(SOH)
    for (const part of parts) {
        const [tag, value] = part.split("=")
        if (tag && value !== undefined) {
            fields[tag] = value
        }
    }
    return fields
}

export async function connectToFIX(): Promise<void> {
    if (connectionAttempted) return
    connectionAttempted = true

    const config = getConfig()
    console.log("FIX: Attempting connection...")

    if (!config.senderCompID || !config.password) {
        console.warn("FIX: Credentials not configured")
        connectionAttempted = false
        return
    }

    try {
        const socket = config.useSSL
            ? tls.connect({
                host: config.host,
                port: config.port,
                rejectUnauthorized: false,
                minVersion: "TLSv1.2" as const,
            })
            : net.connect({ host: config.host, port: config.port })

        const connectEvent = config.useSSL ? "secureConnect" : "connect"

        socket.on(connectEvent, () => {
            console.log("FIX: Connected")
            const accountId = config.senderCompID.split(".").pop() || config.senderCompID
            const logonMsg = buildFIXMessage("A", {
                "98": "0",
                "108": "30",
                "553": accountId,
                "554": config.password,
                "141": "Y",
            }, config)
            socket.write(logonMsg)
        })

        socket.on("data", (data) => {
            const message = data.toString()
            console.log("FIX: Received:", message.replace(/\x01/g, "|"))
            const fields = parseFIXMessage(message)
            const msgType = fields["35"]

            if (msgType === "3") {
                console.error("FIX: Rejected:", fields["58"])
                return
            }

            if (msgType === "5") {
                console.log("FIX: Logout:", fields["58"])
                return
            }

            if (msgType === "A") {
                console.log("FIX: Logon OK - subscribing to GBPJPY (Symbol ID 7)")
                const SOH = "\x01"
                const now = new Date()
                const pad = (n: number, len = 2) => n.toString().padStart(len, "0")
                const ts = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}.${pad(now.getUTCMilliseconds(), 3)}`

                // GBPJPY = Symbol ID 7
                const body = [
                    `35=V`,
                    `49=${config.senderCompID}`,
                    `56=${config.targetCompID}`,
                    `50=${config.senderSubID}`,
                    `57=${config.senderSubID}`,
                    `34=${msgSeqNum++}`,
                    `52=${ts}`,
                    `262=MDR_GBPJPY`,
                    `263=1`,
                    `264=0`,
                    `267=2`,
                    `269=0`,
                    `269=1`,
                    `146=1`,
                    `55=7`,
                ].join(SOH) + SOH

                const bodyLen = Buffer.byteLength(body, "utf8")
                const hdr = `8=FIX.4.4${SOH}9=${bodyLen}${SOH}`
                const msg = hdr + body
                const chk = calculateChecksum(msg)
                socket.write(msg + `10=${chk}${SOH}`)
                console.log("FIX: Subscribed to GBPJPY")
            } else if (msgType === "W" || msgType === "X") {
                const sym = fields["55"] || "?"

                // FIXメッセージから複数のMDEntryを抽出
                // 269=0 (Bid), 269=1 (Ask) のペアを探す
                let bid = cachedPrice?.bid || 0
                let ask = cachedPrice?.ask || 0

                // 生のメッセージを再パースして複数の269/270ペアを取得
                const sep = "\x01"
                const parts = message.split(sep)
                let currentEntryType = ""

                for (const part of parts) {
                    const [tag, value] = part.split("=")
                    if (tag === "269") {
                        currentEntryType = value // 0=Bid, 1=Ask
                    } else if (tag === "270" && value) {
                        const price = parseFloat(value)
                        if (price > 100 && price < 500) { // GBPJPYの妥当な範囲
                            if (currentEntryType === "0") {
                                bid = price
                            } else if (currentEntryType === "1") {
                                ask = price
                            }
                        }
                    }
                }

                // Symbol ID 7 = GBPJPY
                if (sym === "7" && (bid > 0 || ask > 0)) {
                    // BidまたはAskのどちらかが更新されたら保存
                    if (bid > 0 && ask === 0) ask = bid
                    if (ask > 0 && bid === 0) bid = ask

                    cachedPrice = {
                        symbol: "GBPJPY",
                        bid,
                        ask,
                        timestamp: new Date()
                    }
                    lastUpdateTime = new Date()

                    // Emit price update event for WebSocket subscribers
                    if (typeof globalThis !== 'undefined' && (globalThis as Record<string, unknown>).onFIXPriceUpdate) {
                        ((globalThis as Record<string, unknown>).onFIXPriceUpdate as (price: PriceQuote) => void)(cachedPrice)
                    }
                }
            } else if (msgType === "0") {
                socket.write(buildFIXMessage("0", {}, config))
            }
        })

        socket.on("error", (err) => {
            console.error("FIX Error:", err.message)
            connectionAttempted = false
        })

        socket.on("close", () => {
            console.log("FIX: Closed")
            connectionAttempted = false
            setTimeout(() => connectToFIX(), 5000)
        })
    } catch (e) {
        console.error("FIX Failed:", e)
        connectionAttempted = false
    }
}

export function getCachedPrice(): PriceQuote | null {
    return cachedPrice
}

export function isPriceValid(): boolean {
    if (!lastUpdateTime) return false
    return Date.now() - lastUpdateTime.getTime() < 10000
}

export function getCurrentPrice(): PriceQuote | null {
    const mode = process.env.PRICE_FEED_MODE
    if (mode === "fix") {
        connectToFIX()
        if (cachedPrice && isPriceValid()) return cachedPrice
        // FIX接続がまだ確立されていない場合はmockにフォールバック
    }
    // mock または デフォルト（未設定時）
    const bid = 207.8 + (Math.random() - 0.5) * 0.1
    return { symbol: "GBPJPY", bid: Math.round(bid * 1000) / 1000, ask: Math.round((bid + 0.02) * 1000) / 1000, timestamp: new Date() }
}

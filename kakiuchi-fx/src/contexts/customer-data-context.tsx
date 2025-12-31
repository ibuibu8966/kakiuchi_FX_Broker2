"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { useSession } from "next-auth/react"

interface AccountData {
    id: string
    accountNumber: string
    balance: number
    equity: number
    usedMargin: number
    freeMargin: number
    marginLevel: number
    leverage: number
    status: string
}

interface Position {
    id: string
    symbol: string
    side: "BUY" | "SELL"
    quantity: number
    entryPrice: number
    currentPrice?: number
    unrealizedPnl?: number
    status: string
    createdAt: string
}

interface Trade {
    id: string
    symbol: string
    side: "BUY" | "SELL"
    quantity: number
    price: number
    pnl: number | null
    executedAt: string
}

interface Transaction {
    id: string
    type: "DEPOSIT" | "WITHDRAWAL"
    amount: string
    status: string
    network: string | null
    walletAddress: string | null
    txHash: string | null
    createdAt: string
}

interface SystemSettings {
    swapBuy: number
    swapSell: number
    depositWalletAddress: string | null
    depositQrImageUrl: string | null
}

interface ChatRoom {
    id: string
    subject: string | null
    status: string
    messages: Array<{
        id: string
        content: string
        senderType: "USER" | "ADMIN"
        createdAt: string
        isRead: boolean
    }>
}

interface UserProfile {
    id: string
    name: string | null
    email: string
    phone: string | null
}

interface CustomerDataContextType {
    // Data
    account: AccountData | null
    positions: Position[]
    trades: Trade[]
    transactions: Transaction[]
    settings: SystemSettings | null
    chatRoom: ChatRoom | null
    user: UserProfile | null

    // Loading state
    isLoading: boolean
    isInitialized: boolean

    // Refresh functions
    refreshAccount: () => Promise<void>
    refreshPositions: () => Promise<void>
    refreshTransactions: () => Promise<void>
    refreshChatRoom: () => Promise<void>
    refreshAll: () => Promise<void>
}

const CustomerDataContext = createContext<CustomerDataContextType | undefined>(undefined)

export function CustomerDataProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession()

    const [account, setAccount] = useState<AccountData | null>(null)
    const [positions, setPositions] = useState<Position[]>([])
    const [trades, setTrades] = useState<Trade[]>([])
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [settings, setSettings] = useState<SystemSettings | null>(null)
    const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null)
    const [user, setUser] = useState<UserProfile | null>(null)

    const [isLoading, setIsLoading] = useState(true)
    const [isInitialized, setIsInitialized] = useState(false)

    const refreshAccount = useCallback(async () => {
        try {
            const res = await fetch("/api/account")
            if (res.ok) {
                const data = await res.json()
                setAccount(data)
            }
        } catch {
            // ignore
        }
    }, [])

    const refreshPositions = useCallback(async () => {
        try {
            const res = await fetch("/api/positions")
            if (res.ok) {
                const data = await res.json()
                setPositions(data.positions || [])
                setTrades(data.trades || [])
            }
        } catch {
            // ignore
        }
    }, [])

    const refreshTransactions = useCallback(async () => {
        try {
            const res = await fetch("/api/transactions")
            if (res.ok) {
                const data = await res.json()
                setTransactions(data.transactions || [])
            }
        } catch {
            // ignore
        }
    }, [])

    const refreshChatRoom = useCallback(async () => {
        try {
            const res = await fetch("/api/chat")
            if (res.ok) {
                const data = await res.json()
                setChatRoom(data.chatRoom || null)
            }
        } catch {
            // ignore
        }
    }, [])

    const refreshSettings = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/settings")
            if (res.ok) {
                const data = await res.json()
                if (data.settings) {
                    setSettings({
                        swapBuy: data.settings.swapBuy || 0,
                        swapSell: data.settings.swapSell || 0,
                        depositWalletAddress: data.settings.depositWalletAddress || null,
                        depositQrImageUrl: data.settings.depositQrImageUrl || null,
                    })
                }
            }
        } catch {
            // ignore
        }
    }, [])

    const refreshUser = useCallback(async () => {
        try {
            const res = await fetch("/api/account/profile")
            if (res.ok) {
                const data = await res.json()
                setUser(data.user || null)
            }
        } catch {
            // ignore
        }
    }, [])

    const refreshAll = useCallback(async () => {
        setIsLoading(true)
        await Promise.all([
            refreshAccount(),
            refreshPositions(),
            refreshTransactions(),
            refreshSettings(),
            refreshChatRoom(),
            refreshUser(),
        ])
        setIsLoading(false)
        setIsInitialized(true)
    }, [refreshAccount, refreshPositions, refreshTransactions, refreshSettings, refreshChatRoom, refreshUser])

    // Initial data fetch when session is available
    useEffect(() => {
        if (status === "authenticated" && session?.user && !isInitialized) {
            refreshAll()
        } else if (status === "unauthenticated") {
            setIsLoading(false)
        }
    }, [status, session, isInitialized, refreshAll])

    // Auto-refresh account every 5 seconds for real-time updates (like trade page needs)
    useEffect(() => {
        if (!isInitialized) return

        const interval = setInterval(() => {
            refreshAccount()
        }, 5000)

        return () => clearInterval(interval)
    }, [isInitialized, refreshAccount])

    return (
        <CustomerDataContext.Provider
            value={{
                account,
                positions,
                trades,
                transactions,
                settings,
                chatRoom,
                user,
                isLoading,
                isInitialized,
                refreshAccount,
                refreshPositions,
                refreshTransactions,
                refreshChatRoom,
                refreshAll,
            }}
        >
            {children}
        </CustomerDataContext.Provider>
    )
}

export function useCustomerData() {
    const context = useContext(CustomerDataContext)
    if (context === undefined) {
        throw new Error("useCustomerData must be used within a CustomerDataProvider")
    }
    return context
}

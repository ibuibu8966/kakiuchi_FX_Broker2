"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { useSession } from "next-auth/react"

interface AdminStats {
    totalUsers: number
    pendingTransactions: number
    openPositions: number
    openChats: number
    totalBalance: string
}

interface UserWithAccount {
    id: string
    name: string | null
    email: string
    phone: string | null
    role: string
    createdAt: string
    accounts: Array<{
        accountNumber: string
        balance: string
        status: string
        leverage: number
    }>
}

interface TransactionWithUser {
    id: string
    type: "DEPOSIT" | "WITHDRAWAL"
    amount: string
    status: string
    network: string | null
    walletAddress: string | null
    txHash: string | null
    createdAt: string
    accountId: string
    account: {
        user: {
            name: string | null
            email: string
        }
    }
}

interface PositionWithUser {
    id: string
    symbol: string
    side: "BUY" | "SELL"
    quantity: string
    entryPrice: string
    status: string
    createdAt: string
    account: {
        user: {
            name: string | null
            email: string
        }
    }
}

interface ChatRoomWithMessages {
    id: string
    userId: string
    subject: string | null
    status: string
    createdAt: string
    user: {
        name: string | null
        email: string
    }
    messages: Array<{
        id: string
        content: string
        senderType: "USER" | "ADMIN"
        createdAt: string
        isRead: boolean
    }>
    _count: {
        messages: number
    }
}

interface AdminDataContextType {
    // Data
    stats: AdminStats | null
    users: UserWithAccount[]
    transactions: TransactionWithUser[]
    positions: PositionWithUser[]
    chatRooms: ChatRoomWithMessages[]

    // Loading state
    isLoading: boolean
    isInitialized: boolean

    // Refresh functions
    refreshStats: () => Promise<void>
    refreshUsers: () => Promise<void>
    refreshTransactions: () => Promise<void>
    refreshPositions: () => Promise<void>
    refreshChatRooms: () => Promise<void>
    refreshAll: () => Promise<void>
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined)

export function AdminDataProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession()

    const [stats, setStats] = useState<AdminStats | null>(null)
    const [users, setUsers] = useState<UserWithAccount[]>([])
    const [transactions, setTransactions] = useState<TransactionWithUser[]>([])
    const [positions, setPositions] = useState<PositionWithUser[]>([])
    const [chatRooms, setChatRooms] = useState<ChatRoomWithMessages[]>([])

    const [isLoading, setIsLoading] = useState(true)
    const [isInitialized, setIsInitialized] = useState(false)

    const refreshStats = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/stats")
            if (res.ok) {
                const data = await res.json()
                setStats(data)
            }
        } catch {
            // ignore
        }
    }, [])

    const refreshUsers = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/users")
            if (res.ok) {
                const data = await res.json()
                setUsers(data.users || [])
            }
        } catch {
            // ignore
        }
    }, [])

    const refreshTransactions = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/transactions")
            if (res.ok) {
                const data = await res.json()
                setTransactions(data.transactions || [])
            }
        } catch {
            // ignore
        }
    }, [])

    const refreshPositions = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/positions")
            if (res.ok) {
                const data = await res.json()
                setPositions(data.positions || [])
            }
        } catch {
            // ignore
        }
    }, [])

    const refreshChatRooms = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/chat")
            if (res.ok) {
                const data = await res.json()
                setChatRooms(data.chatRooms || [])
            }
        } catch {
            // ignore
        }
    }, [])

    const refreshAll = useCallback(async () => {
        setIsLoading(true)
        await Promise.all([
            refreshStats(),
            refreshUsers(),
            refreshTransactions(),
            refreshPositions(),
            refreshChatRooms(),
        ])
        setIsLoading(false)
        setIsInitialized(true)
    }, [refreshStats, refreshUsers, refreshTransactions, refreshPositions, refreshChatRooms])

    // Initial data fetch when session is available and user is admin
    useEffect(() => {
        if (status === "authenticated" && session?.user?.role === "ADMIN" && !isInitialized) {
            refreshAll()
        } else if (status === "unauthenticated") {
            setIsLoading(false)
        }
    }, [status, session, isInitialized, refreshAll])

    // Auto-refresh stats every 10 seconds for real-time updates
    useEffect(() => {
        if (!isInitialized) return

        const interval = setInterval(() => {
            refreshStats()
        }, 10000)

        return () => clearInterval(interval)
    }, [isInitialized, refreshStats])

    return (
        <AdminDataContext.Provider
            value={{
                stats,
                users,
                transactions,
                positions,
                chatRooms,
                isLoading,
                isInitialized,
                refreshStats,
                refreshUsers,
                refreshTransactions,
                refreshPositions,
                refreshChatRooms,
                refreshAll,
            }}
        >
            {children}
        </AdminDataContext.Provider>
    )
}

export function useAdminData() {
    const context = useContext(AdminDataContext)
    if (context === undefined) {
        throw new Error("useAdminData must be used within an AdminDataProvider")
    }
    return context
}

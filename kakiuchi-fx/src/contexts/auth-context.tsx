"use client"

import { createContext, useContext, useMemo } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"

interface User {
    id: string
    email: string
    name: string
    role: "USER" | "ADMIN"
}

interface AuthContextType {
    session: Session | null
    status: "loading" | "authenticated" | "unauthenticated"
    isLoading: boolean
    isAuthenticated: boolean
    user: User | null
    isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()

    const value = useMemo<AuthContextType>(() => {
        const isLoading = status === "loading"
        const isAuthenticated = status === "authenticated" && !!session?.user
        const user = session?.user ? {
            id: session.user.id as string,
            email: session.user.email as string,
            name: session.user.name as string,
            role: (session.user.role as "USER" | "ADMIN") || "USER",
        } : null
        const isAdmin = user?.role === "ADMIN"

        return {
            session,
            status,
            isLoading,
            isAuthenticated,
            user,
            isAdmin,
        }
    }, [session, status])

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}

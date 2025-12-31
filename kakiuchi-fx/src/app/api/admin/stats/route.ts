import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const [
            totalUsers,
            pendingTransactions,
            openPositions,
            openChats,
            totalBalance,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.transaction.count({ where: { status: "PENDING" } }),
            prisma.position.count({ where: { status: "OPEN" } }),
            prisma.chatRoom.count({ where: { status: "OPEN" } }),
            prisma.account.aggregate({ _sum: { balance: true } }),
        ])

        return NextResponse.json({
            totalUsers,
            pendingTransactions,
            openPositions,
            openChats,
            totalBalance: (totalBalance._sum.balance || 0n).toString(),
        })
    } catch (error) {
        console.error("Error fetching admin stats:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
